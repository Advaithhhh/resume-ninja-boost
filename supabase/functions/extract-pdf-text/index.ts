
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
  cleanedText = cleanedText.split('\n').filter(line => {
    if (line.length === 0) return true; // Keep blank lines resulting from \n\n paragraph breaks
    const alphaNumericChars = (line.match(/[a-zA-Z0-9]/g) || []).length;
    const totalChars = line.length;
    const alphaNumericRatio = totalChars > 0 ? alphaNumericChars / totalChars : 0;

    // Filter out lines that are very short and mostly non-alphanumeric
    if (totalChars > 0 && totalChars < 5 && alphaNumericRatio < 0.4) return false; 
    // Filter out longer lines that are overwhelmingly non-alphanumeric (e.g., "------------")
    if (totalChars > 10 && alphaNumericRatio < 0.15 && alphaNumericChars < 3) return false; 
    
    return true;
  }).join('\n');

  // Final overall trim
  cleanedText = cleanedText.trim();

  return cleanedText;
}

// Helper function to try OCR extraction for image-like content
async function tryOCRExtraction(base64File: string, mimeType: string): Promise<string> {
  // Only attempt OCR for PDFs and image files
  if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
    throw new Error('OCR not suitable for this file type');
  }

  const ocrApiKey = 'helloworld'; // Free public API key for ocr.space
  const formData = new FormData();
  
  // For PDFs, we need to specify the correct format
  let dataUri = `data:${mimeType};base64,${base64File}`;
  
  formData.append('base64Image', dataUri);
  formData.append('apikey', ocrApiKey);
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('isTable', 'true'); // Better for structured documents
  
  const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });
  
  if (!ocrResponse.ok) {
    throw new Error(`OCR.space API error: ${ocrResponse.status} ${ocrResponse.statusText}`);
  }
  
  const ocrResult = await ocrResponse.json();

  if (ocrResult.IsErroredOnProcessing) {
    throw new Error(`OCR.space processing error: ${ocrResult.ErrorMessage?.join(', ') || 'Unknown error'}`);
  }
  
  if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
    return ocrResult.ParsedResults.map((r: any) => r.ParsedText || '').join('\n');
  }
  
  throw new Error('No text found in OCR results');
}

// Helper function to extract text from base64 content for text-based files
function extractTextFromBase64(base64Content: string, mimeType: string): string {
  try {
    // Decode base64 to get the actual file content
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // For plain text files, just decode as UTF-8
    if (mimeType === 'text/plain') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    
    // For other text-based formats, try to extract readable text
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Basic text extraction for simple formats
    if (textContent && textContent.length > 0) {
      // Remove null bytes and other control characters
      return textContent.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
    }
    
    throw new Error('No readable text found');
  } catch (error) {
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base64File, fileType } = await req.json();
    if (!base64File) {
      throw new Error("No base64File provided in the request body.");
    }
    
    const mimeType = fileType || 'application/octet-stream';
    let extractedText = '';

    console.log(`Processing file type: ${mimeType}...`);

    // Strategy 1: For plain text files, extract directly
    if (mimeType === 'text/plain') {
      try {
        extractedText = extractTextFromBase64(base64File, mimeType);
        console.log(`Successfully extracted text from plain text file. Length: ${extractedText.length}`);
      } catch (error) {
        console.error('Error extracting plain text:', error);
        extractedText = 'Failed to extract text from plain text file.';
      }
    }
    // Strategy 2: For RTF files, try direct text extraction first
    else if (mimeType === 'text/rtf' || mimeType === 'application/rtf') {
      try {
        const rawText = extractTextFromBase64(base64File, mimeType);
        // Basic RTF text extraction - remove RTF control codes
        extractedText = rawText
          .replace(/\\[a-z]+\d*\s?/gi, ' ') // Remove RTF control words
          .replace(/[{}]/g, ' ') // Remove braces
          .replace(/\\\\/g, '\\') // Unescape backslashes
          .replace(/\\'/g, "'") // Unescape quotes
          .trim();
        
        if (extractedText.length < 50) {
          throw new Error('Insufficient text extracted');
        }
        console.log(`Successfully extracted text from RTF file. Length: ${extractedText.length}`);
      } catch (error) {
        console.log('RTF direct extraction failed, trying OCR...');
        try {
          extractedText = await tryOCRExtraction(base64File, mimeType);
          console.log(`Successfully extracted text from RTF via OCR. Length: ${extractedText.length}`);
        } catch (ocrError) {
          console.error('RTF OCR extraction failed:', ocrError);
          extractedText = 'Failed to extract text from RTF file. The file may be corrupted or in an unsupported RTF format.';
        }
      }
    }
    // Strategy 3: For PDFs and other complex documents, use OCR
    else {
      try {
        extractedText = await tryOCRExtraction(base64File, mimeType);
        console.log(`Successfully extracted text via OCR. Length: ${extractedText.length}`);
      } catch (ocrError) {
        console.error('OCR extraction failed:', ocrError);
        
        // Fallback: try direct text extraction for unknown formats
        try {
          console.log('Trying fallback text extraction...');
          extractedText = extractTextFromBase64(base64File, mimeType);
          if (extractedText.length < 20) {
            throw new Error('Insufficient text extracted');
          }
          console.log(`Fallback extraction successful. Length: ${extractedText.length}`);
        } catch (fallbackError) {
          console.error('Fallback extraction failed:', fallbackError);
          extractedText = `Unable to extract text from this ${mimeType} file. The file may be image-based, password-protected, or corrupted. Please try uploading a text-based document or a clearer scan.`;
        }
      }
    }

    // Clean the extracted text
    if (extractedText && !extractedText.includes('Unable to extract') && !extractedText.includes('Failed to extract')) {
      extractedText = cleanAndValidateText(extractedText);
    }

    // Final validation
    if (!extractedText || extractedText.length < 20) { 
      extractedText = `Unable to extract sufficient readable text from this ${mimeType} file. Please ensure the document contains readable text and try uploading a different format (PDF, DOCX, or TXT work best).`;
    }

    console.log('Final extracted text length:', extractedText.length);
    console.log('First 200 characters:', extractedText.substring(0, 200));

    return new Response(JSON.stringify({ extractedText: extractedText.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-text function:', error);
    return new Response(JSON.stringify({ 
      error: `Failed to process file: ${error.message}`,
      extractedText: "File processing failed. Please ensure your file is a readable document (PDF, DOCX, DOC, TXT, or RTF) and try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
