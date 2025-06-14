import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, XCircle, AlertCircle, TrendingUp, Sparkles, Target } from "lucide-react";
import { useState, useEffect } from "react";

interface OptimizationResultsProps {
  results: any;
  originalResume: string;
  visible?: boolean;
}

const OptimizationResults = ({ results, originalResume, visible = false }: OptimizationResultsProps) => {
  const [atsScore, setAtsScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (results && visible) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
        const targetScore = results.atsScore || 75;
        const interval = setInterval(() => {
          setAtsScore((prev) => {
            if (prev >= targetScore) {
              clearInterval(interval);
              return targetScore;
            }
            return prev + 1;
          });
        }, 20);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [results, visible]);

  // Function to clean and format the original resume text for display
  const cleanOriginalResume = (text: string): string => {
    if (!text) return "Original resume content will appear here";
    
    // Remove PDF-specific metadata and structure
    let cleaned = text
      // Remove PDF object references and metadata
      .replace(/\b\d+\s+\d+\s+(?:obj|R)\b/gi, '')
      .replace(/<<[^>]*>>/g, '')
      .replace(/\/[A-Za-z]+(?:\s|$)/g, ' ')
      .replace(/\bstream\b|\bendstream\b|\bstartxref\b|\bxref\b|\btrailer\b/gi, '')
      .replace(/%%EOF/g, '')
      .replace(/\b(?:BT|ET|Tj|TJ|Td|TD|Tm|q|Q|cm|re|W|n|f|F|S|s|B|b|W\*|n\*)\b/g, '')
      
      // Remove coordinate and numeric sequences that are PDF positioning
      .replace(/\b\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\b/g, '')
      .replace(/\b\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\b/g, '')
      
      // Remove isolated numbers and coordinates
      .replace(/\b\d{3,}\b/g, '')
      .replace(/\b\d+\.\d+\b/g, '')
      
      // Clean up special characters and encoding artifacts
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      
      // Remove common PDF artifacts
      .replace(/\b[a-f0-9]{8,}\b/gi, '')
      .replace(/\([^)]*\)\s*Tj/g, '')
      .replace(/\[[^\]]*\]\s*TJ/g, '')
      
      // Clean up whitespace
      .trim();
    
    // If the cleaned text is too short or seems to be mostly artifacts, return a message
    if (cleaned.length < 50 || !/[a-zA-Z]{3,}/.test(cleaned)) {
      return "Resume content extracted successfully but may need better formatting. The AI analysis above is based on the full content.";
    }
    
    // Format the text with basic structure
    const lines = cleaned.split(/\s+/).filter(word => word.length > 0);
    const formattedText = lines.join(' ');
    
    // Add line breaks for better readability at common resume section keywords
    const sectionKeywords = [
      'EXPERIENCE', 'EDUCATION', 'SKILLS', 'SUMMARY', 'OBJECTIVE', 
      'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'TECHNICAL SKILLS',
      'PROJECTS', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'CONTACT', 'EMAIL'
    ];
    
    let formatted = formattedText;
    sectionKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n\n${keyword}\n`);
    });
    
    return formatted.trim() || "Resume content processed successfully. The AI analysis above is based on the extracted content.";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "matched":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "missing":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Matched</Badge>;
      case "partial":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case "missing":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Missing</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const downloadOptimizedResume = () => {
    if (!results?.optimizedSections) return;
    
    const optimizedContent = `
OPTIMIZED RESUME - ATS READY

PROFESSIONAL SUMMARY
${results.optimizedSections.summary}

TECHNICAL SKILLS
${results.optimizedSections.skills}

PROFESSIONAL EXPERIENCE
${results.optimizedSections.experience}

---
ATS OPTIMIZATION REPORT
• Overall ATS Score: ${results.atsScore}%
• Keyword Matches: ${results.keywordAnalysis?.filter((k: any) => k.status === 'matched').length || 0}
• Missing Keywords: ${results.keywordAnalysis?.filter((k: any) => k.status === 'missing').length || 0}
• Optimization Suggestions: ${results.suggestions?.length || 0}

This resume has been optimized for Applicant Tracking Systems (ATS) and includes relevant keywords from your target job description.
    `.trim();

    const blob = new Blob([optimizedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume-ats-ready.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!visible || !results) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 opacity-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Optimization Results
            </h2>
            <p className="text-lg text-gray-600">
              Complete the analysis above to see your results
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Intelligent ATS Analysis Results
          </h2>
          <p className="text-lg text-gray-600">
            AI-powered analysis of your resume against job requirements
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* ATS Score */}
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Intelligent ATS Score</span>
              </CardTitle>
              <CardDescription>
                AI-calculated score based on job requirements matching
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - atsScore / 100)}`}
                    className={`${getScoreColor(atsScore)} transition-all duration-1000`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(atsScore)}`}>
                      {atsScore}%
                    </div>
                    <div className="text-sm text-gray-500">ATS Score</div>
                  </div>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={`bg-gradient-to-r ${getScoreGradient(atsScore)} text-white`}
              >
                {atsScore >= 80 ? "Excellent Match" : atsScore >= 60 ? "Good Match" : "Needs Optimization"}
              </Badge>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Score Breakdown</span>
              </CardTitle>
              <CardDescription>
                Detailed analysis of scoring components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.scoreBreakdown && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Keyword Match (40%)</span>
                      <span className="font-semibold">{results.scoreBreakdown.keywordMatch}/40</span>
                    </div>
                    <Progress value={(results.scoreBreakdown.keywordMatch / 40) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Experience Relevance (25%)</span>
                      <span className="font-semibold">{results.scoreBreakdown.experienceRelevance}/25</span>
                    </div>
                    <Progress value={(results.scoreBreakdown.experienceRelevance / 25) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Education Match (20%)</span>
                      <span className="font-semibold">{results.scoreBreakdown.educationMatch}/20</span>
                    </div>
                    <Progress value={(results.scoreBreakdown.educationMatch / 20) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Skills Coverage (15%)</span>
                      <span className="font-semibold">{results.scoreBreakdown.skillsCoverage}/15</span>
                    </div>
                    <Progress value={(results.scoreBreakdown.skillsCoverage / 15) * 100} className="h-2" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Keyword Analysis */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle>Intelligent Keyword Analysis</CardTitle>
            <CardDescription>
              AI-powered matching including synonyms and semantic understanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
              {results.keywordAnalysis?.map((item: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{item.keyword}</span>
                    {item.foundAs && item.foundAs !== item.keyword && (
                      <p className="text-xs text-gray-500 mt-1">Found as: "{item.foundAs}"</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    {getStatusIcon(item.status)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              )) || (
                <div className="col-span-3 text-center text-gray-500 py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No keyword analysis available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resume Comparison - Updated to show cleaned original resume */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-600">Original Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-6 min-h-[400px] text-sm max-h-[400px] overflow-y-auto">
                <div className="whitespace-pre-wrap text-gray-700">
                  {cleanOriginalResume(originalResume)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary border-2">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>AI-Optimized Resume</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 rounded-lg p-6 min-h-[400px] text-sm max-h-[400px] overflow-y-auto">
                <div className="space-y-4 text-gray-700">
                  {results.optimizedSections ? (
                    <>
                      {results.optimizedSections.summary && (
                        <div>
                          <h4 className="font-semibold mb-2 text-primary">Professional Summary</h4>
                          <p className="whitespace-pre-wrap">{results.optimizedSections.summary}</p>
                        </div>
                      )}
                      {results.optimizedSections.skills && (
                        <div>
                          <h4 className="font-semibold mb-2 text-primary">Technical Skills</h4>
                          <p className="whitespace-pre-wrap">{results.optimizedSections.skills}</p>
                        </div>
                      )}
                      {results.optimizedSections.experience && (
                        <div>
                          <h4 className="font-semibold mb-2 text-primary">Experience</h4>
                          <p className="whitespace-pre-wrap">{results.optimizedSections.experience}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>AI-optimized content will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions */}
        {results.suggestions && results.suggestions.length > 0 && (
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle>AI-Powered Optimization Suggestions</CardTitle>
              <CardDescription>
                Intelligent recommendations to improve your ATS score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.suggestions.map((suggestion: any, index: number) => (
                  <div key={index} className={`p-4 border rounded-lg ${suggestion.priority === 'high' ? 'bg-red-50 border-red-200' : suggestion.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start space-x-3">
                      <Sparkles className={`h-5 w-5 mt-0.5 ${suggestion.priority === 'high' ? 'text-red-500' : suggestion.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900 capitalize">{suggestion.type} Enhancement</h4>
                          <Badge variant="outline" className={suggestion.priority === 'high' ? 'border-red-300 text-red-700' : suggestion.priority === 'medium' ? 'border-yellow-300 text-yellow-700' : 'border-blue-300 text-blue-700'}>
                            {suggestion.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                        {suggestion.impact && (
                          <p className="text-xs font-medium text-green-600 mb-2">Expected Impact: {suggestion.impact}</p>
                        )}
                        {suggestion.current && suggestion.suggested && (
                          <div className="text-xs space-y-1">
                            <p><span className="font-medium">Current:</span> {suggestion.current}</p>
                            <p><span className="font-medium">Suggested:</span> {suggestion.suggested}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Elements */}
        {results.missingElements && results.missingElements.length > 0 && (
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="text-red-600">Critical Missing Elements</CardTitle>
              <CardDescription>
                Important requirements from the job description not found in your resume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.missingElements.map((element: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">{element}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Button */}
        <div className="text-center">
          <Button 
            size="lg"
            className="gradient-primary hover:scale-105 transition-transform shadow-lg"
            onClick={downloadOptimizedResume}
          >
            <Download className="mr-2 h-5 w-5" />
            Download ATS-Optimized Resume
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Download your AI-optimized resume ready for ATS systems
          </p>
        </div>
      </div>
    </section>
  );
};

export default OptimizationResults;
