
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
    
    // Method 4: Fallback - extract any readable ASCII text
    if (!extractedText.trim()) {
      // Look for sequences of readable characters
      const readableChunks = pdfText.match(/[a-zA-Z][a-zA-Z0-9\s.,;:!?@#$%^&*()\-_+={}[\]|\\<>/~`"']{10,}/g);
      if (readableChunks) {
        extractedText = readableChunks
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
      .trim();
    
    // Final validation
    if (!extractedText || extractedText.length < 50) {
      extractedText = "Unable to extract readable text from this PDF. The PDF may contain scanned images instead of selectable text, or it may be password-protected. Please try uploading a PDF with selectable text content.";
    }

    console.log('Extracted text length:', extractedText.length);
    console.log('First 200 characters:', extractedText.substring(0, 200));

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
