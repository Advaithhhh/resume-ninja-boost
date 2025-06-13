
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import OptimizationResults from "@/components/OptimizationResults";
import HowItWorks from "@/components/HowItWorks";
import PricingSection from "@/components/PricingSection";
import { useState } from "react";

const Index = () => {
  const [resumeContent, setResumeContent] = useState("");
  const [readableResumeContent, setReadableResumeContent] = useState("");
  const [optimizationResults, setOptimizationResults] = useState(null);

  const handleResumeProcessed = (content: string, readable?: string) => {
    setResumeContent(content);
    setReadableResumeContent(readable || content);
    setOptimizationResults(null); // Reset results when new resume is uploaded
  };

  const handleOptimizationComplete = (results: any) => {
    setOptimizationResults(results);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <HowItWorks />
      <ResumeUpload onResumeProcessed={handleResumeProcessed} />
      <JobDescriptionInput 
        resumeContent={resumeContent}
        onOptimizationComplete={handleOptimizationComplete}
        disabled={!resumeContent}
      />
      <OptimizationResults 
        results={optimizationResults}
        originalResume={readableResumeContent}
        visible={!!optimizationResults}
      />
      <PricingSection />
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="gradient-primary p-2 rounded-lg">
                  <span className="text-white font-bold">📄</span>
                </div>
                <span className="text-xl font-bold">resume.ninja</span>
              </div>
              <p className="text-gray-400">
                AI-powered resume optimization for students and professionals.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">How it Works</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Templates</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Resume Tips</a></li>
                <li><a href="#" className="hover:text-white">Interview Guide</a></li>
                <li><a href="#" className="hover:text-white">Career Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 resume.ninja. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
