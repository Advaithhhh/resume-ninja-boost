
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Check } from "lucide-react";
import { useState } from "react";

const ResumeUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [resumeText, setResumeText] = useState("");

  const handleFileUpload = () => {
    setIsUploading(true);
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Your Resume
          </h2>
          <p className="text-lg text-gray-600">
            Choose your preferred method to get started with optimization
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* File Upload */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Upload PDF</span>
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
                onClick={!uploadComplete ? handleFileUpload : undefined}
              >
                {uploadComplete ? (
                  <div className="animate-scale-in">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-700 font-semibold">Resume uploaded successfully!</p>
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
                  <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
                </div>
              )}
              
              {!uploadComplete && !isUploading && (
                <Button 
                  className="w-full mt-4 gradient-primary hover:scale-105 transition-transform"
                  onClick={handleFileUpload}
                >
                  Select File
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Text Input */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-accent" />
                <span>Paste Resume Text</span>
              </CardTitle>
              <CardDescription>
                Copy and paste your resume content directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your resume content here..."
                className="min-h-[200px] resize-none border-gray-300 focus:border-primary"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
              <Button 
                className="w-full mt-4 gradient-accent hover:scale-105 transition-transform"
                disabled={!resumeText.trim()}
              >
                Process Text
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ResumeUpload;
