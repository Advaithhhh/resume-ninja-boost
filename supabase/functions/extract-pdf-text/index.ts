
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
    
    // Basic PDF text extraction
    // This is a simplified approach - for production, you'd want a more robust PDF parser
    const pdfText = new TextDecoder().decode(pdfBytes);
    
    // Try to extract readable text from PDF structure
    let extractedText = '';
    
    // Look for text content between stream objects
    const textMatches = pdfText.match(/BT[\s\S]*?ET/g);
    if (textMatches) {
      for (const match of textMatches) {
        // Extract text from PDF text objects
        const textContent = match.match(/\((.*?)\)/g);
        if (textContent) {
          for (const text of textContent) {
            const cleanText = text.slice(1, -1); // Remove parentheses
            if (cleanText.length > 1 && /[a-zA-Z]/.test(cleanText)) {
              extractedText += cleanText + ' ';
            }
          }
        }
      }
    }
    
    // Fallback: try to extract any readable text
    if (!extractedText.trim()) {
      const readableText = pdfText
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
        .replace(/\s+/g, ' ') // Normalize whitespace
        .split(' ')
        .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
        .join(' ');
      
      extractedText = readableText;
    }
    
    // If we still don't have meaningful text, return a helpful message
    if (!extractedText.trim() || extractedText.length < 50) {
      extractedText = "Unable to extract text from this PDF. Please ensure the PDF contains selectable text (not just scanned images). You may need to use a PDF with actual text content rather than scanned images.";
    }

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
