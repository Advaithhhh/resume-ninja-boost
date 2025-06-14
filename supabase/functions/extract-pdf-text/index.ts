import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to clean and validate extracted text
function cleanAndValidateText(text: string): string {
  let cleanedText = text;

  // Stage 1: Remove non-printable/control characters (except common whitespace) and specific PDF artifacts
  cleanedText = cleanedText.replace(/[^\x20-\x7E\n\r\t]/g, ' '); // Keep printable ASCII & tab, CR, LF. Replace others with space.
  cleanedText = cleanedText.replace(/\b(?:obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF)\b/gi, ' ');
  cleanedText = cleanedText.replace(/\b\d+\s+\d+\s+(?:obj|R)\b/gi, ' ');
  cleanedText = cleanedText.replace(/<<.*?>>/g, ' '); // Non-greedy match for dictionaries
  cleanedText = cleanedText.replace(/\/[A-Za-z0-9_]+(?:\s|$)/g, ' '); // PDF names like /Font
  cleanedText = cleanedText.replace(/\b(?:BT|ET|Tj|TJ|Tf|Td|Tm|Tc|Tw|Ts|Tz)\b/g, ' '); // PDF text operators

  // Stage 2: Normalize whitespace carefully to preserve structure
  cleanedText = cleanedText.replace(/[\t\f\v ]+/g, ' '); // Collapse multiple horizontal spaces to one
  cleanedText = cleanedText.replace(/ \n/g, '\n');     // Remove space before newline
  cleanedText = cleanedText.replace(/\n /g, '\n');     // Remove space after newline
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines to two (paragraph break)
  
  // Remove leading/trailing whitespace from each line (after major newline normalization)
  cleanedText = cleanedText.split('\n').map(line => line.trim()).join('\n');
  
  // Stage 3: Remove lines that are likely noise (e.g., consisting mostly of symbols or very short)
  // This step should come after line trimming and paragraph normalization
  cleanedText = cleanedText.split('\n').filter(line => {
    if (line.length === 0) return true; // Keep blank lines resulting from \n\n paragraph breaks
    const alphaNumericChars = (line.match(/[a-zA-Z0-9]/g) || []).length;
    const totalChars = line.length;
    const alphaNumericRatio = totalChars > 0 ? alphaNumericChars / totalChars : 0;

    // Filter out lines that are very short and mostly non-alphanumeric
    if (totalChars > 0 && totalChars < 5 && alphaNumericRatio < 0.4) return false; 
    // Filter out longer lines that are overwhelmingly non-alphanumeric (e.g., "------------")
    // but try to keep lines with at least a few alphanumeric chars (e.g. short titles)
    if (totalChars > 10 && alphaNumericRatio < 0.15 && alphaNumericChars < 3) return false; 
    
    return true;
  }).join('\n');

  // Final overall trim
  cleanedText = cleanedText.trim();

  return cleanedText;
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
    
    let extractedText = '';

    // Step 1: Directly use OCR for text extraction
    console.log(`Starting OCR.space extraction...`);
    try {
      const ocrApiKey = 'helloworld'; // Free public API key for ocr.space
      const formData = new FormData();
      // The API can take the PDF directly as a base64 string
      formData.append('base64Image', `data:application/pdf;base64,${base64Pdf}`);
      formData.append('apikey', ocrApiKey);
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      
      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!ocrResponse.ok) {
        throw new Error(`OCR.space API error: ${ocrResponse.status} ${ocrResponse.statusText}`);
      }
      
      const ocrResult = await ocrResponse.json();

      if (ocrResult.IsErroredOnProcessing) {
        throw new Error(`OCR.space processing error: ${ocrResult.ErrorMessage.join(', ')}`);
      }
      
      if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
        extractedText = ocrResult.ParsedResults.map((r: any) => r.ParsedText).join('\n');
        console.log("Successfully extracted text via OCR.space. Length:", extractedText.length);
        extractedText = cleanAndValidateText(extractedText); // Clean the OCR output as well
      } else {
        console.log("OCR.space did not return any parsed text.");
      }
    } catch (ocrError) {
      console.error("Error during OCR extraction:", ocrError);
      // If OCR fails, we'll set a specific error message.
      extractedText = "Failed to process PDF using OCR. The service may be unavailable or the file could be corrupted.";
    }


    // Step 2: Final validation before returning
    if (!extractedText || extractedText.length < 50) { 
      extractedText = "Unable to extract sufficient readable text from this PDF using OCR. It may be a very low-quality scan, password-protected, or in an unsupported format.";
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
      extractedText: "PDF processing failed via OCR. Please ensure your PDF is not corrupted and is a clear scan."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
