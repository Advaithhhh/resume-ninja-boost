
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
    const { base64File } = await req.json();

    // Convert base64 to Uint8Array
    const fileBytes = Uint8Array.from(atob(base64File), c => c.charCodeAt(0));
    
    let extractedText = '';
    
    try {
      // Try to extract text from DOCX (which is a ZIP file containing XML)
      extractedText = await extractTextFromDOCX(fileBytes);
    } catch (error) {
      console.error('DOCX extraction failed, trying as DOC:', error);
      // Fallback for older DOC files - basic text extraction
      extractedText = extractTextFromDOC(fileBytes);
    }
    
    // Clean and validate the extracted text
    extractedText = cleanAndValidateText(extractedText);
    
    // Final validation and fallback
    if (!extractedText || extractedText.length < 10) {
      extractedText = "Unable to extract readable text from this document. The file may be corrupted, password-protected, or in an unsupported format. Please try uploading a different file or convert to PDF format.";
    }

    console.log('Extracted text length:', extractedText.length);
    console.log('First 500 characters:', extractedText.substring(0, 500));

    return new Response(JSON.stringify({ extractedText: extractedText.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-docx-text function:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to process document. Please ensure you're uploading a valid DOCX or DOC file.",
      extractedText: "Document processing failed. Please try uploading a different file or convert to PDF format."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Extract text from DOCX files (ZIP format containing XML)
async function extractTextFromDOCX(fileBytes: Uint8Array): Promise<string> {
  // Simple DOCX text extraction
  // DOCX files are ZIP archives containing XML files
  const text = new TextDecoder('utf-8').decode(fileBytes);
  
  let extractedText = '';
  
  // Look for text content in XML format typical of DOCX files
  // DOCX stores text in document.xml within <w:t> tags
  const textMatches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (textMatches) {
    for (const match of textMatches) {
      const textContent = match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
      if (textContent && textContent.trim().length > 0) {
        extractedText += textContent + ' ';
      }
    }
  }
  
  // Alternative pattern for simpler XML structures
  if (!extractedText.trim()) {
    const altMatches = text.match(/>([^<]{3,})</g);
    if (altMatches) {
      for (const match of altMatches) {
        const content = match.slice(1, -1).trim();
        if (content && content.length > 2 && /[a-zA-Z]/.test(content)) {
          extractedText += content + ' ';
        }
      }
    }
  }
  
  return extractedText;
}

// Extract text from older DOC files (binary format)
function extractTextFromDOC(fileBytes: Uint8Array): string {
  const text = new TextDecoder('latin1').decode(fileBytes);
  let extractedText = '';
  
  // Basic text extraction for DOC files
  // Look for readable ASCII sequences
  const readablePatterns = [
    /[A-Za-z][A-Za-z0-9\s.,;:!?@#%^&*()\-_+={}[\]|\\<>/~`"']{15,}/g,
    /(?:Name|Email|Phone|Address|Experience|Education|Skills|Summary|Objective)[^<>{}]{10,}/gi,
    /(?:\b[A-Z][a-z]+\s+[A-Z][a-z]+\b)/g, // Names
    /(?:\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/g, // Dates
    /(?:\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/g, // Phone numbers
    /(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g // Emails
  ];
  
  for (const pattern of readablePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleanMatch = cleanText(match);
        if (cleanMatch && cleanMatch.length > 3 && /[a-zA-Z]/.test(cleanMatch)) {
          extractedText += cleanMatch + ' ';
        }
      }
    }
  }
  
  return extractedText;
}

// Helper function to clean extracted text
function cleanText(text: string): string {
  return text
    .replace(/[^\x20-\x7E\s]/g, ' ') // Keep only printable ASCII
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Helper function to clean and validate extracted text
function cleanAndValidateText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
    .replace(/\b(?:xml|docx|word|document|version|encoding)\b/gi, ' ') // Remove document metadata
    .replace(/\b\d+\s*(?:px|pt|em|rem|%)\b/gi, ' ') // Remove formatting values
    .replace(/xmlns[^=]*="[^"]*"/gi, ' ') // Remove XML namespaces
    .replace(/<[^>]*>/g, ' ') // Remove any remaining XML/HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}
