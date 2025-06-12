
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, FileText, Target } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <div className="mb-8 lg:mb-0">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Land More Interviews With an{" "}
              <span className="text-gradient">AI-Optimized Resume</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Scan job descriptions, boost your ATS score, and get noticed by top employers. 
              Perfect for students ready to launch their careers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="gradient-primary text-white hover:scale-105 transition-transform shadow-lg group"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white"
              >
                Watch Demo
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="gradient-primary p-3 rounded-xl">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Upload Resume</h3>
                    <p className="text-sm text-gray-500">Drop your PDF or paste text</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="gradient-accent p-3 rounded-xl">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Add Job Description</h3>
                    <p className="text-sm text-gray-500">Paste your target role</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="gradient-purple p-3 rounded-xl">
                    <Bot className="h-6 w-6 text-white animate-pulse-slow" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Optimization</h3>
                    <p className="text-sm text-gray-500">Get instant ATS improvements</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 gradient-primary rounded-full opacity-20 animate-float"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 gradient-accent rounded-full opacity-20 animate-bounce-subtle"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
