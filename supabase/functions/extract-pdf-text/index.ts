
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
    
    // Convert to string for text extraction
    const pdfText = new TextDecoder('latin1').decode(pdfBytes);
    
    let extractedText = '';
    let cleanedText = '';
    
    // Method 1: Extract text from PDF text objects (BT...ET blocks)
    const textBlocks = pdfText.match(/BT\s+(.*?)\s+ET/gs);
    if (textBlocks) {
      for (const block of textBlocks) {
        // Look for text strings in parentheses or brackets
        const textStrings = block.match(/\((.*?)\)/g) || block.match(/\[(.*?)\]/g);
        if (textStrings) {
          for (const str of textStrings) {
            let cleanText = str.slice(1, -1); // Remove parentheses/brackets
            // Clean up PDF escape sequences
            cleanText = cleanText
              .replace(/\\n/g, ' ')
              .replace(/\\r/g, ' ')
              .replace(/\\t/g, ' ')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
            
            if (cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
              extractedText += cleanText + ' ';
            }
          }
        }
      }
    }
    
    // Method 2: Look for Tj and TJ operators (text showing operators)
    if (!extractedText.trim()) {
      const tjMatches = pdfText.match(/\((.*?)\)\s*Tj/g);
      if (tjMatches) {
        for (const match of tjMatches) {
          const text = match.match(/\((.*?)\)/)[1];
          if (text && text.length > 1 && /[a-zA-Z]/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Method 3: Extract from TJ arrays
    if (!extractedText.trim()) {
      const tjArrayMatches = pdfText.match(/\[(.*?)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const match of tjArrayMatches) {
          const content = match.match(/\[(.*?)\]/)[1];
          const textParts = content.match(/\((.*?)\)/g);
          if (textParts) {
            for (const part of textParts) {
              const text = part.slice(1, -1);
              if (text && text.length > 1 && /[a-zA-Z]/.test(text)) {
                extractedText += text + ' ';
              }
            }
          }
        }
      }
    }
    
    // Clean up the extracted text for better readability
    if (extractedText.trim()) {
      cleanedText = extractedText
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
        .replace(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, '$1 $2') // Fix name spacing
        .replace(/\b(B\.?Tech|BTech|B\.?E\.?|BE|B\.?Sc|BSc|B\.?A\.?|BA|M\.?Tech|MTech|M\.?E\.?|ME|M\.?Sc|MSc|MBA|PhD|Ph\.?D\.?)\b/gi, (match) => {
          // Standardize education terms
          const term = match.toLowerCase().replace(/\./g, '');
          const educationMap = {
            'btech': 'B.Tech',
            'be': 'B.E.',
            'bsc': 'B.Sc',
            'ba': 'B.A',
            'mtech': 'M.Tech',
            'me': 'M.E.',
            'msc': 'M.Sc',
            'mba': 'MBA',
            'phd': 'Ph.D'
          };
          return educationMap[term] || match;
        })
        .replace(/(\d{4})\s*-\s*(\d{4}|\w+)/g, '$1-$2') // Fix date ranges
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
        .trim();
    }
    
    // Create a more readable version for display
    const readableText = cleanedText || extractedText;
    const formattedText = readableText
      .split(/\s+/)
      .reduce((acc, word, index, array) => {
        acc += word;
        
        // Add line breaks for better formatting
        if (index < array.length - 1) {
          const nextWord = array[index + 1];
          // Add line break after email, phone, or address patterns
          if (/[@.]/.test(word) && /^[A-Z]/.test(nextWord)) {
            acc += '\n';
          }
          // Add line break before section headers (capitalized words)
          else if (/^[A-Z][A-Z\s]+$/.test(nextWord) && nextWord.length > 3) {
            acc += '\n\n';
          }
          // Add line break after years or GPA
          else if (/(\d{4}|GPA|CGPA)/i.test(word) && /^[A-Z]/.test(nextWord)) {
            acc += '\n';
          }
          else {
            acc += ' ';
          }
        }
        
        return acc;
      }, '');
    
    // Final validation
    if (!cleanedText || cleanedText.length < 50) {
      const fallbackText = "Unable to extract readable text from this PDF. The PDF may contain scanned images instead of selectable text, or it may be password-protected. Please try uploading a PDF with selectable text content.";
      
      return new Response(JSON.stringify({ 
        extractedText: fallbackText,
        readableText: fallbackText 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Extracted text length:', cleanedText.length);
    console.log('First 200 characters:', cleanedText.substring(0, 200));

    return new Response(JSON.stringify({ 
      extractedText: cleanedText.trim(),
      readableText: formattedText.trim()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-pdf-text function:', error);
    const errorText = "PDF processing failed. Please try uploading a different PDF file or ensure your PDF contains selectable text (not scanned images).";
    
    return new Response(JSON.stringify({ 
      error: "Failed to process PDF. Please ensure you're uploading a valid PDF file with selectable text content.",
      extractedText: errorText,
      readableText: errorText
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
