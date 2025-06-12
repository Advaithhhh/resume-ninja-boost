
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

const OptimizationResults = () => {
  const [atsScore, setAtsScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and score animation
    const timer = setTimeout(() => {
      setIsLoading(false);
      const interval = setInterval(() => {
        setAtsScore((prev) => {
          if (prev >= 87) {
            clearInterval(interval);
            return 87;
          }
          return prev + 1;
        });
      }, 20);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const matchedKeywords = [
    { keyword: "React", status: "matched" },
    { keyword: "TypeScript", status: "matched" },
    { keyword: "JavaScript", status: "matched" },
    { keyword: "CSS", status: "added" },
    { keyword: "Git", status: "matched" },
    { keyword: "Responsive Design", status: "added" },
    { keyword: "Problem Solving", status: "missing" },
    { keyword: "Agile", status: "missing" },
  ];

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
              <div className="grid sm:grid-cols-2 gap-4">
                {matchedKeywords.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                  >
                    <span className="font-medium text-gray-900">{item.keyword}</span>
                    <div className="flex items-center space-x-2">
                      {item.status === "matched" && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Matched
                          </Badge>
                        </>
                      )}
                      {item.status === "added" && (
                        <>
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Added
                          </Badge>
                        </>
                      )}
                      {item.status === "missing" && (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Missing
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                ))}
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
              <div className="bg-gray-100 rounded-lg p-6 min-h-[400px] text-sm">
                <div className="space-y-4 text-gray-700">
                  <h3 className="font-bold text-lg">John Smith</h3>
                  <p>Frontend Developer</p>
                  <div>
                    <h4 className="font-semibold mb-2">Experience</h4>
                    <p>Worked with React and JavaScript to build web applications.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Skills</h4>
                    <p>React, JavaScript, HTML</p>
                  </div>
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
              <div className="bg-blue-50 rounded-lg p-6 min-h-[400px] text-sm">
                <div className="space-y-4 text-gray-700">
                  <h3 className="font-bold text-lg">John Smith</h3>
                  <p>Frontend Developer & React Specialist</p>
                  <div>
                    <h4 className="font-semibold mb-2">Experience</h4>
                    <p>Developed responsive web applications using <strong>React</strong>, <strong>TypeScript</strong>, and <strong>JavaScript</strong>. Implemented <strong>CSS</strong> frameworks for optimal user experience.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Technical Skills</h4>
                    <p><strong>React</strong>, <strong>TypeScript</strong>, <strong>JavaScript</strong>, <strong>CSS</strong>, <strong>Git</strong>, <strong>Responsive Design</strong>, HTML</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Download Button */}
        <div className="text-center mt-8">
          <Button 
            size="lg"
            className="gradient-primary hover:scale-105 transition-transform shadow-lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Optimized Resume
          </Button>
        </div>
      </div>
    </section>
  );
};

export default OptimizationResults;
