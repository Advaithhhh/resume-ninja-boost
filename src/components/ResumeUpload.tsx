
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploadProps {
  onResumeProcessed: (content: string) => void;
}

const ResumeUpload = ({ onResumeProcessed }: ResumeUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const { toast } = useToast();

  const extractTextFromPDF = async (file: File, openaiApiKey: string): Promise<string> => {
    try {
      // Convert PDF to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.readAsDataURL(file);
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract all the text content from this PDF resume. Return only the extracted text content, preserving the structure and formatting as much as possible.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  };

  const handleFileUpload = async (file?: File) => {
    if (!apiKey.trim()) {
      setShowApiInput(true);
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to process the resume.",
        variant: "destructive",
      });
      return;
    }

    let selectedFile = file;
    if (!selectedFile) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          handleFileUpload(files[0]);
        }
      };
      input.click();
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file only.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress while processing
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const extractedText = await extractTextFromPDF(selectedFile, apiKey);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);
      
      onResumeProcessed(extractedText);
      
      toast({
        title: "Resume Processed Successfully",
        description: "Your resume has been parsed and is ready for optimization.",
      });
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Processing Failed",
        description: "Failed to process the PDF. Please check your API key and try again.",
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

        {showApiInput && !uploadComplete && (
          <Card className="max-w-2xl mx-auto mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <span>OpenAI API Key Required</span>
              </CardTitle>
              <CardDescription className="text-orange-700">
                Enter your OpenAI API key to parse PDF content. Get one at openai.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="border-orange-300 focus:border-orange-500"
                />
                <Button 
                  onClick={() => setShowApiInput(false)}
                  disabled={!apiKey.trim()}
                  className="w-full gradient-primary"
                >
                  Continue with API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Upload PDF Resume</span>
              </CardTitle>
              <CardDescription>
                Drag and drop your resume file or click to browse
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
                    <p className="text-green-700 font-semibold">Resume uploaded and processed successfully!</p>
                    <p className="text-sm text-green-600 mt-2">Now add your target job description below</p>
                  </div>
                ) : (
                  <div>
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PDF files only, max 5MB</p>
                  </div>
                )}
              </div>
              
              {isUploading && (
                <div className="mt-4 animate-fade-in">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-gray-600 mt-2">Processing PDF... {uploadProgress}%</p>
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
