
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out resume.ninja",
      features: [
        "1 resume optimization",
        "Basic ATS score",
        "Keyword analysis",
        "PDF download"
      ],
      button: "Get Started Free",
      popular: false,
      icon: Check
    },
    {
      name: "Student",
      price: "$9",
      period: "month",
      description: "Everything students need to land internships",
      features: [
        "Unlimited optimizations",
        "Advanced ATS scoring",
        "Multiple job targeting",
        "Premium templates",
        "Cover letter generator",
        "Interview tips"
      ],
      button: "Start Free Trial",
      popular: true,
      icon: Zap
    },
    {
      name: "Professional",
      price: "$25",
      period: "month",
      description: "For professionals seeking career growth",
      features: [
        "Everything in Student",
        "LinkedIn optimization",
        "Industry-specific insights",
        "Personal branding guide",
        "Priority support",
        "Career coaching session"
      ],
      button: "Upgrade Now",
      popular: false,
      icon: Crown
    }
  ];

  return (
    <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, Student-Friendly Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Start free and upgrade as you advance your career. 
            No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                plan.popular ? 'border-primary border-2 shadow-lg' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 gradient-primary text-white">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className={`${plan.popular ? 'gradient-primary' : 'bg-gray-100'} p-3 rounded-xl w-12 h-12 mx-auto mb-4 flex items-center justify-center`}>
                  <plan.icon className={`h-6 w-6 ${plan.popular ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'gradient-primary hover:scale-105' 
                      : 'border-primary text-primary hover:bg-primary hover:text-white'
                  } transition-transform`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.button}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            🎓 <strong>Student Discount:</strong> Get 50% off with valid .edu email
          </p>
          <p className="text-sm text-gray-500">
            All plans include 7-day free trial • No setup fees • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
