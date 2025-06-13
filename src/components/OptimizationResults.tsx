
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, XCircle, AlertCircle, TrendingUp, Sparkles } from "lucide-react";
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
      case "added":
        return <Sparkles className="h-4 w-4 text-blue-500" />;
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
      case "added":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Added</Badge>;
      case "missing":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Missing</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
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
            Optimization Results
          </h2>
          <p className="text-lg text-gray-600">
            Your resume has been analyzed and optimized for ATS compatibility
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ATS Score */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>ATS Score</span>
              </CardTitle>
              <CardDescription>
                How well your resume matches the job requirements
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
                    <div className="text-sm text-gray-500">Score</div>
                  </div>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={`bg-gradient-to-r ${getScoreGradient(atsScore)} text-white`}
              >
                {atsScore >= 80 ? "Excellent" : atsScore >= 60 ? "Good" : "Needs Improvement"}
              </Badge>
            </CardContent>
          </Card>

          {/* Keyword Analysis */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>Keyword Match Analysis</CardTitle>
              <CardDescription>
                Track how your resume aligns with job requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                {results.keywordAnalysis?.map((item: any, index: number) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                  >
                    <span className="font-medium text-gray-900">{item.keyword}</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                )) || (
                  <div className="col-span-2 text-center text-gray-500 py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No keyword analysis available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resume Comparison */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-600">Original Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-6 min-h-[400px] text-sm max-h-[400px] overflow-y-auto">
                <div className="whitespace-pre-wrap text-gray-700">
                  {originalResume || "Original resume content will appear here"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary border-2">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Optimized Resume</span>
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
                      {results.rawAnalysis && (
                        <div>
                          <h4 className="font-semibold mb-2 text-primary">AI Analysis</h4>
                          <p className="whitespace-pre-wrap text-xs">{results.rawAnalysis}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>Optimized content will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        {results.suggestions && results.suggestions.length > 0 && (
          <Card className="mt-8 shadow-lg">
            <CardHeader>
              <CardTitle>Optimization Suggestions</CardTitle>
              <CardDescription>
                Key improvements to boost your ATS score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.suggestions.map((suggestion: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 capitalize">{suggestion.type} Enhancement</h4>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                        {suggestion.current && suggestion.suggested && (
                          <div className="mt-2 text-xs">
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

        {/* Download Button */}
        <div className="text-center mt-8">
          <Button 
            size="lg"
            className="gradient-primary hover:scale-105 transition-transform shadow-lg"
            onClick={() => alert('Sign in required to download optimized resume')}
          >
            <Download className="mr-2 h-5 w-5" />
            Download Optimized Resume
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Sign in to download your optimized resume
          </p>
        </div>
      </div>
    </section>
  );
};

export default OptimizationResults;
