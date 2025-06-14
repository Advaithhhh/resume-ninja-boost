
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base64Pdf } = await req.json();

    // Convert base64 to Uint8Array
    const pdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0));
    
    // Convert to string for text extraction with proper encoding
    const pdfText = new TextDecoder('latin1').decode(pdfBytes);
    
    let extractedText = '';
    
    // Method 1: Enhanced text extraction from PDF streams
    const streamMatches = pdfText.match(/stream\s+(.*?)\s+endstream/gs);
    if (streamMatches) {
      for (const stream of streamMatches) {
        const content = stream.replace(/^stream\s+/, '').replace(/\s+endstream$/, '');
        
        // Try to extract text from the stream content
        const textContent = extractTextFromStream(content);
        if (textContent && textContent.length > 10) {
          extractedText += textContent + ' ';
        }
      }
    }
    
    // Method 2: Improved BT...ET block parsing
    if (!extractedText.trim() || extractedText.length < 100) {
      const textBlocks = pdfText.match(/BT\s+(.*?)\s+ET/gs);
      if (textBlocks) {
        for (const block of textBlocks) {
          // Extract text with better parsing
          const blockText = extractTextFromBTBlock(block);
          if (blockText) {
            extractedText += blockText + ' ';
          }
        }
      }
    }
    
    // Method 3: Enhanced Tj and TJ operator parsing
    if (!extractedText.trim() || extractedText.length < 100) {
      // Single text strings
      const tjMatches = pdfText.match(/\(((?:[^()\\]|\\[()\\])*)\)\s*Tj/g);
      if (tjMatches) {
        for (const match of tjMatches) {
          const textMatch = match.match(/\(((?:[^()\\]|\\[()\\])*)\)/);
          if (textMatch && textMatch[1]) {
            const cleanText = cleanPDFText(textMatch[1]);
            if (cleanText && cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
              extractedText += cleanText + ' ';
            }
          }
        }
      }
      
      // Array text strings
      const tjArrayMatches = pdfText.match(/\[((?:[^\[\]\\]|\\[[\]\\])*)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const match of tjArrayMatches) {
          const arrayContent = match.match(/\[((?:[^\[\]\\]|\\[[\]\\])*)\]/);
          if (arrayContent && arrayContent[1]) {
            const textParts = arrayContent[1].match(/\(((?:[^()\\]|\\[()\\])*)\)/g);
            if (textParts) {
              for (const part of textParts) {
                const textMatch = part.match(/\(((?:[^()\\]|\\[()\\])*)\)/);
                if (textMatch && textMatch[1]) {
                  const cleanText = cleanPDFText(textMatch[1]);
                  if (cleanText && cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
                    extractedText += cleanText + ' ';
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Method 4: Enhanced fallback text extraction
    if (!extractedText.trim() || extractedText.length < 100) {
      // Look for text content in various PDF formats
      const contentMatches = pdfText.match(/\/Contents\s+\d+\s+\d+\s+R/g);
      if (contentMatches) {
        // Try to find referenced content objects
        for (const contentRef of contentMatches) {
          const objNum = contentRef.match(/\/Contents\s+(\d+)/);
          if (objNum) {
            const objPattern = new RegExp(`${objNum[1]}\\s+\\d+\\s+obj\\s+(.*?)\\s+endobj`, 'gs');
            const objMatches = pdfText.match(objPattern);
            if (objMatches) {
              for (const obj of objMatches) {
                const objText = extractTextFromObject(obj);
                if (objText) {
                  extractedText += objText + ' ';
                }
              }
            }
          }
        }
      }
    }
    
    // Method 5: Direct text pattern extraction
    if (!extractedText.trim() || extractedText.length < 100) {
      // Look for readable ASCII sequences that might be text content
      const readablePatterns = [
        /[A-Za-z][A-Za-z0-9\s.,;:!?@#%^&*()\-_+={}[\]|\\<>/~`"']{15,}/g,
        /(?:Name|Email|Phone|Address|Experience|Education|Skills|Summary)[^<>{}]{10,}/gi,
        /(?:\b[A-Z][a-z]+\s+[A-Z][a-z]+\b)/g, // Names
        /(?:\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/g, // Dates
        /(?:\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/g, // Phone numbers
        /(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g // Emails
      ];
      
      for (const pattern of readablePatterns) {
        const matches = pdfText.match(pattern);
        if (matches) {
          for (const match of matches) {
            const cleanMatch = cleanPDFText(match);
            if (cleanMatch && cleanMatch.length > 3 && /[a-zA-Z]/.test(cleanMatch)) {
              extractedText += cleanMatch + ' ';
            }
          }
        }
      }
    }
    
    // Clean up and validate the extracted text
    extractedText = cleanAndValidateText(extractedText);
    
    // Final validation and fallback
    if (!extractedText || extractedText.length < 50) {
      extractedText = "Unable to extract readable text from this PDF. The PDF may contain scanned images, be password-protected, or use an unsupported text encoding. Please try uploading a PDF with selectable text content or convert scanned images to text-searchable PDF.";
    }

    console.log('Extracted text length:', extractedText.length);
    console.log('First 500 characters:', extractedText.substring(0, 500));

    return new Response(JSON.stringify({ extractedText: extractedText.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-pdf-text function:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to process PDF. Please ensure you're uploading a valid PDF file with selectable text content.",
      extractedText: "PDF processing failed. Please try uploading a different PDF file or ensure your PDF contains selectable text (not scanned images)."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract text from stream content
function extractTextFromStream(content: string): string {
  let text = '';
  
  // Look for text operators in the stream
  const textOperators = content.match(/\(((?:[^()\\]|\\[()\\])*)\)\s*(?:Tj|TJ)/g);
  if (textOperators) {
    for (const op of textOperators) {
      const textMatch = op.match(/\(((?:[^()\\]|\\[()\\])*)\)/);
      if (textMatch && textMatch[1]) {
        const cleanText = cleanPDFText(textMatch[1]);
        if (cleanText && /[a-zA-Z]/.test(cleanText)) {
          text += cleanText + ' ';
        }
      }
    }
  }
  
  return text;
}

// Helper function to extract text from BT...ET blocks
function extractTextFromBTBlock(block: string): string {
  let text = '';
  
  // Extract all text strings from the block
  const textStrings = block.match(/\(((?:[^()\\]|\\[()\\])*)\)/g);
  if (textStrings) {
    for (const str of textStrings) {
      const cleanStr = str.slice(1, -1); // Remove parentheses
      const cleanText = cleanPDFText(cleanStr);
      if (cleanText && cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
        text += cleanText + ' ';
      }
    }
  }
  
  // Also check for array format
  const arrayStrings = block.match(/\[((?:[^\[\]\\]|\\[[\]\\])*)\]/g);
  if (arrayStrings) {
    for (const arr of arrayStrings) {
      const textParts = arr.match(/\(((?:[^()\\]|\\[()\\])*)\)/g);
      if (textParts) {
        for (const part of textParts) {
          const cleanText = cleanPDFText(part.slice(1, -1));
          if (cleanText && cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
            text += cleanText + ' ';
          }
        }
      }
    }
  }
  
  return text;
}

// Helper function to extract text from PDF objects
function extractTextFromObject(obj: string): string {
  let text = '';
  
  // Look for stream content in the object
  const streamMatch = obj.match(/stream\s+(.*?)\s+endstream/s);
  if (streamMatch) {
    text += extractTextFromStream(streamMatch[1]);
  }
  
  // Look for direct text content
  const textMatches = obj.match(/\(((?:[^()\\]|\\[()\\])*)\)\s*(?:Tj|TJ)/g);
  if (textMatches) {
    for (const match of textMatches) {
      const textContent = match.match(/\(((?:[^()\\]|\\[()\\])*)\)/);
      if (textContent && textContent[1]) {
        const cleanText = cleanPDFText(textContent[1]);
        if (cleanText && /[a-zA-Z]/.test(cleanText)) {
          text += cleanText + ' ';
        }
      }
    }
  }
  
  return text;
}

// Helper function to clean PDF text
function cleanPDFText(text: string): string {
  return text
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/[^\x20-\x7E\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to clean and validate extracted text
function cleanAndValidateText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
    .replace(/\b(?:obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF)\b/gi, ' ') // Remove PDF keywords
    .replace(/\b\d+\s+\d+\s+(?:obj|R)\b/gi, ' ') // Remove object references
    .replace(/<<[^>]*>>/g, ' ') // Remove dictionary objects
    .replace(/\/[A-Za-z]+(?:\s|$)/g, ' ') // Remove PDF names/commands
    .replace(/\s+/g, ' ')
    .trim();
}
