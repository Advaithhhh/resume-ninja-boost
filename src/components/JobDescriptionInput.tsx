
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface JobDescriptionInputProps {
  resumeContent: string;
  onOptimizationComplete: (result: any) => void;
  disabled?: boolean;
}

const JobDescriptionInput = ({ resumeContent, onOptimizationComplete, disabled = false }: JobDescriptionInputProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeResumeAndJob = async (resume: string, jobDesc: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-resume', {
        body: { resume, jobDescription: jobDesc }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  };

  const handleAnalyze = async () => {
    if (!resumeContent) {
      toast({
        title: "No Resume Found",
        description: "Please upload a resume first.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim()) {
      toast({
        title: "Job Description Required",
        description: "Please enter a job description to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeResumeAndJob(resumeContent, jobDescription);
      onOptimizationComplete(result);
      
      toast({
        title: "Analysis Complete",
        description: "Your resume optimization results are ready!",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (disabled) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 opacity-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Add Your Target Job Description
            </h2>
            <p className="text-lg text-gray-600">
              Upload your resume first to unlock this step
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Add Your Target Job Description
          </h2>
          <p className="text-lg text-gray-600">
            Help our AI understand what employers are looking for
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="gradient-primary text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-white">
              <Target className="h-6 w-6" />
              <span>Job Description Analysis</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-white/80" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-white text-gray-900 border shadow-lg">
                    <p>Paste the job description for your target role.<br />
                    Our AI will identify key skills and requirements.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="text-white/90">
              Copy the complete job posting to get the best optimization results
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Paste the complete job description here...

Example:
Software Engineer - Frontend
We are looking for a passionate Frontend Developer with experience in React, TypeScript, and modern web technologies. The ideal candidate should have:
• 2+ years of experience with React and JavaScript
• Knowledge of CSS frameworks and responsive design
• Experience with version control (Git)
• Strong problem-solving skills..."
                className="min-h-[300px] resize-none border-gray-300 focus:border-primary text-sm"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {jobDescription.length} characters
                </p>
                <Button 
                  onClick={handleAnalyze}
                  disabled={!jobDescription.trim() || isAnalyzing || !resumeContent}
                  className="gradient-primary hover:scale-105 transition-transform"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze & Optimize
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="gradient-primary p-3 rounded-full w-12 h-12 mx-auto mb-3">
              <Target className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Be Specific</h3>
            <p className="text-sm text-gray-600">Include the complete job posting for best results</p>
          </div>
          <div className="text-center p-4">
            <div className="gradient-accent p-3 rounded-full w-12 h-12 mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Keywords Matter</h3>
            <p className="text-sm text-gray-600">Our AI extracts key skills and requirements</p>
          </div>
          <div className="text-center p-4">
            <div className="gradient-purple p-3 rounded-full w-12 h-12 mx-auto mb-3">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Multiple Jobs</h3>
            <p className="text-sm text-gray-600">Optimize for different roles separately</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobDescriptionInput;
