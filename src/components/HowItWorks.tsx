
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Target, Bot, Download, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      title: "Upload Your Resume",
      description: "Drag and drop your PDF or paste your resume text. Our system supports all common formats.",
      color: "gradient-primary"
    },
    {
      icon: Target,
      title: "Add Job Description",
      description: "Paste the job posting you're targeting. Our AI analyzes requirements and keywords.",
      color: "gradient-accent"
    },
    {
      icon: Bot,
      title: "AI Optimization",
      description: "Advanced algorithms optimize your resume for ATS systems and highlight relevant skills.",
      color: "gradient-purple"
    },
    {
      icon: Download,
      title: "Download & Apply",
      description: "Get your optimized resume with improved ATS score and start landing interviews.",
      color: "gradient-primary"
    }
  ];

  return (
    <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How resume.ninja Works
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Transform your resume in minutes with our AI-powered optimization process. 
            Get past ATS systems and land more interviews.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className={`${step.color} p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600 leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>
              
              {/* Arrow between steps (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">95%</div>
            <div className="text-gray-600">ATS Compatibility</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">3x</div>
            <div className="text-gray-600">More Interview Calls</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">2 min</div>
            <div className="text-gray-600">Average Processing Time</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
