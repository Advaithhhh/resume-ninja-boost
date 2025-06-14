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

    const pdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0));
    
    let extractedText = '';

    // Step 1: Attempt advanced text extraction first
    try {
      console.log("Attempting PDF text extraction with advanced positional logic...");
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdfDocument = await loadingTask.promise;
      console.log(`PDF loaded. Number of pages: ${pdfDocument.numPages}`);

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        if (items.length === 0) {
            if (typeof page.cleanup === 'function') {
                page.cleanup();
            }
            continue; // Skip empty pages
        }

        // A more sophisticated extraction that respects text position
        // Group text items into lines based on their vertical position (y-coordinate)
        const lines: { [y: number]: any[] } = {};
        items.forEach(item => {
            // Round the y-coordinate to group items on the same line, allowing for small variations
            const y = Math.round(item.transform[5]); 
            if (!lines[y]) {
                lines[y] = [];
            }
            lines[y].push(item);
        });

        // Get the y-coordinates and sort them to process lines from top to bottom
        const sortedYCoords = Object.keys(lines).map(parseFloat).sort((a, b) => b - a);

        // For each line, sort its items by x-coordinate and join their text
        sortedYCoords.forEach(y => {
            const lineItems = lines[y];
            lineItems.sort((a, b) => a.transform[4] - b.transform[4]); // Sort by x-coordinate
            
            let lineText = "";
            let lastX = -1;
            let lastWidth = 0;

            lineItems.forEach(item => {
                // Add a space if there's a significant gap between text chunks on the same line
                if (lastX !== -1 && item.transform[4] > lastX + lastWidth + 2) { // 2px tolerance
                    lineText += " ";
                }
                lineText += item.str;
                lastX = item.transform[4];
                lastWidth = item.width;
            });

            extractedText += lineText + '\n';
        });
        
        // Attempt to clean up page resources if the method exists
        if (typeof page.cleanup === 'function') {
          page.cleanup();
        }
      }
      console.log("Advanced extraction complete. Raw text length:", extractedText.length);
    } catch (pdfParseError) {
      console.error('Error during pdf.js parsing:', pdfParseError);
      extractedText = ""; // Ensure text is empty if parsing fails
    }
    
    extractedText = cleanAndValidateText(extractedText);
    
    // Step 2: If text is insufficient, fall back to OCR
    if (!extractedText || extractedText.length < 100) {
      console.log(`Initial text extraction insufficient (${extractedText.length} chars). Falling back to OCR.space...`);
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
        console.error("Error during OCR fallback:", ocrError);
        // If OCR fails, we'll rely on the (likely poor) initial result or the final error message
      }
    }

    // Step 3: Final validation before returning
    if (!extractedText || extractedText.length < 50) { 
      extractedText = "Unable to extract sufficient readable text from this PDF. It may be an image-based PDF, password-protected, or use complex encodings. Please ensure your PDF has selectable text or is a clear scan.";
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
