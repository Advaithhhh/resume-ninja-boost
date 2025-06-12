
import { Button } from "@/components/ui/button";
import { FileText, Zap } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="gradient-primary p-2 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">resume.ninja</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">
              Pricing
            </a>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
