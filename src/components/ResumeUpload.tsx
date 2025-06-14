
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ResumeUploadProps {
  onResumeProcessed: (content: string) => void;
}

const ResumeUpload = ({ onResumeProcessed }: ResumeUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
        body: { base64Pdf: base64 }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Failed to process PDF');
      }

      if (data.error) {
        console.error('PDF extraction error:', data.error);
        return data.extractedText || "Failed to extract text from PDF";
      }

      return data.extractedText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-docx-text', {
        body: { base64File: base64 }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Failed to process DOCX');
      }

      if (data.error) {
        console.error('DOCX extraction error:', data.error);
        return data.extractedText || "Failed to extract text from DOCX";
      }

      return data.extractedText;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw error;
    }
  };

  const extractTextFromPlainText = async (file: File): Promise<string> => {
    try {
      const text = await file.text();
      return text;
    } catch (error) {
      console.error('Error reading plain text file:', error);
      throw error;
    }
  };

  const getSupportedFileTypes = () => {
    return {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/msword': '.doc',
      'text/plain': '.txt',
      'text/rtf': '.rtf',
      'application/rtf': '.rtf'
    };
  };

  const handleFileUpload = async (file?: File) => {
    let selectedFile = file;
    if (!selectedFile) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = Object.values(getSupportedFileTypes()).join(',');
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          handleFileUpload(files[0]);
        }
      };
      input.click();
      return;
    }

    const supportedTypes = getSupportedFileTypes();
    if (!Object.keys(supportedTypes).includes(selectedFile.type) && 
        !Object.values(supportedTypes).some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOCX, DOC, TXT, or RTF file.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      let extractedText = '';

      if (selectedFile.type === 'application/pdf') {
        extractedText = await extractTextFromPDF(selectedFile);
      } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 selectedFile.name.toLowerCase().endsWith('.docx')) {
        extractedText = await extractTextFromDOCX(selectedFile);
      } else if (selectedFile.type === 'application/msword' || 
                 selectedFile.name.toLowerCase().endsWith('.doc')) {
        extractedText = await extractTextFromDOCX(selectedFile);
      } else if (selectedFile.type === 'text/plain' || 
                 selectedFile.name.toLowerCase().endsWith('.txt')) {
        extractedText = await extractTextFromPlainText(selectedFile);
      } else if (selectedFile.type === 'text/rtf' || 
                 selectedFile.type === 'application/rtf' || 
                 selectedFile.name.toLowerCase().endsWith('.rtf')) {
        // For RTF files, treat as plain text for now
        extractedText = await extractTextFromPlainText(selectedFile);
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);
      
      onResumeProcessed(extractedText);
      
      if (extractedText.includes("Unable to extract text") || extractedText.includes("processing failed")) {
        toast({
          title: "File Processed with Issues",
          description: "The file was processed but text extraction had some issues. You may need to try a different file.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Resume Processed Successfully",
          description: "Your resume has been parsed and is ready for optimization.",
        });
      }
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Processing Failed",
        description: "Failed to process the file. Please ensure it's a valid document with readable text.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Your Resume
          </h2>
          <p className="text-lg text-gray-600">
            Upload your resume to get started with AI optimization
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Upload Resume</span>
              </CardTitle>
              <CardDescription>
                Drag and drop your resume file or click to browse. Supported formats: PDF, DOCX, DOC, TXT, RTF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                  ${uploadComplete 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-primary hover:bg-blue-50'
                  }`}
                onClick={!uploadComplete ? () => handleFileUpload() : undefined}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {uploadComplete ? (
                  <div className="animate-scale-in">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-700 font-semibold">Resume uploaded and processed!</p>
                    <p className="text-sm text-green-600 mt-2">Now add your target job description below</p>
                  </div>
                ) : (
                  <div>
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PDF, DOCX, DOC, TXT, RTF files, max 10MB</p>
                    <div className="flex items-center justify-center mt-2 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      <span>Ensure document contains readable text content</span>
                    </div>
                  </div>
                )}
              </div>
              
              {isUploading && (
                <div className="mt-4 animate-fade-in">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-gray-600 mt-2">Processing document... {uploadProgress}%</p>
                </div>
              )}
              
              {!uploadComplete && !isUploading && (
                <Button 
                  className="w-full mt-4 gradient-primary hover:scale-105 transition-transform"
                  onClick={() => handleFileUpload()}
                >
                  Select File
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ResumeUpload;
