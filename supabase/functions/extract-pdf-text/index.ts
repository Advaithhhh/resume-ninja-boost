
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Import pdf.js library from esm.sh CDN for Deno compatibility
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.min.mjs";

// Set the workerSrc for pdf.js. This is crucial.
// Using the esm.sh provided worker.
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.mjs";
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to clean and validate extracted text
function cleanAndValidateText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII and common whitespace
    .replace(/\b(?:obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF)\b/gi, ' ')
    .replace(/\b\d+\s+\d+\s+(?:obj|R)\b/gi, ' ')
    .replace(/<<[^>]*>>/g, ' ')
    .replace(/\/[A-Za-z0-9_]+(?:\s|$)/g, ' ') // Remove PDF names/commands like /Font /Width etc.
    .replace(/BT\b|ET\b|Tj\b|TJ\b|Tf\b|Td\b|Tm\b|Tc\b|Tw\b|Ts\b|Tz\b/g, ' ') // Remove PDF text operators
    .replace(/\s+/g, ' ')
    .trim();
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base64Pdf } = await req.json();
    if (!base64Pdf) {
      throw new Error("No base64Pdf provided in the request body.");
    }

    const pdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0));
    
    let extractedText = '';

    try {
      console.log("Attempting PDF text extraction with pdf.js...");
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdfDocument = await loadingTask.promise;
      console.log(`PDF loaded. Number of pages: ${pdfDocument.numPages}`);

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach((item: any) => { // item is an object with 'str' property
          extractedText += item.str + " ";
        });
        extractedText += "\n"; // Newline after each page's content
        
        // Attempt to clean up page resources if the method exists
        if (typeof page.cleanup === 'function') {
          page.cleanup();
        }
      }
      console.log("pdf.js extraction complete. Raw text length:", extractedText.length);
    } catch (pdfParseError) {
      console.error('Error during pdf.js parsing:', pdfParseError);
      // Fallback to previous method or return error message if pdf.js fails critically
      extractedText = "Failed to extract text using advanced PDF parsing. The document might be corrupted or in an unsupported format.";
      // Optionally, you could try the old regex method here as a last resort.
      // For now, we'll stick to the error message from pdf.js failure.
    }
    
    extractedText = cleanAndValidateText(extractedText);
    
    if (!extractedText || extractedText.length < 20) { // Increased minimum length slightly
      extractedText = "Unable to extract sufficient readable text from this PDF. It may be an image-based PDF, password-protected, or use complex encodings. Please ensure your PDF has selectable text.";
    }

    console.log('Final extracted text length:', extractedText.length);
    console.log('First 500 characters of final text:', extractedText.substring(0, 500));

    return new Response(JSON.stringify({ extractedText: extractedText.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-pdf-text function:', error);
    return new Response(JSON.stringify({ 
      error: `Failed to process PDF: ${error.message}`,
      extractedText: "PDF processing failed. Please ensure your PDF contains selectable text (not scanned images) and is not corrupted."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

