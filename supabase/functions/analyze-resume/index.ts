
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resume, jobDescription } = await req.json();

    console.log('Analyzing resume with length:', resume.length);
    console.log('Job description length:', jobDescription.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert ATS (Applicant Tracking System) analyzer and resume optimization specialist with deep understanding of educational qualifications and industry standards.

EDUCATION EQUIVALENCY GUIDE:
- BTech, B.Tech, Bachelor of Technology = Bachelor's degree
- BE, B.E., Bachelor of Engineering = Bachelor's degree  
- BSc, B.Sc., Bachelor of Science = Bachelor's degree
- BA, B.A., Bachelor of Arts = Bachelor's degree
- BBA, Bachelor of Business Administration = Bachelor's degree
- BCom, B.Com, Bachelor of Commerce = Bachelor's degree
- MTech, M.Tech, Master of Technology = Master's degree
- ME, M.E., Master of Engineering = Master's degree
- MSc, M.Sc., Master of Science = Master's degree
- MBA, Master of Business Administration = Master's degree
- PhD, Ph.D., Doctorate = Doctoral degree

ATS SCORE CALCULATION (Total: 100 points):
1. KEYWORD MATCHING (40 points):
   - Exact keyword matches: 30 points
   - Synonym/related term matches: 10 points

2. EDUCATION REQUIREMENTS (20 points):
   - Meets degree requirement: 20 points
   - Partially meets (e.g., ongoing): 10 points
   - Does not meet: 0 points

3. EXPERIENCE RELEVANCE (25 points):
   - Direct experience match: 25 points
   - Related experience: 15 points
   - Transferable skills: 5 points
   - No relevant experience: 0 points

4. TECHNICAL SKILLS (10 points):
   - Required skills present: 10 points
   - Some skills missing: 5 points
   - Most skills missing: 0 points

5. FORMAT & STRUCTURE (5 points):
   - ATS-friendly format: 5 points
   - Needs improvement: 2 points
   - Poor format: 0 points

Return ONLY a valid JSON response with this exact structure:
{
  "atsScore": number (0-100, calculated using above criteria),
  "scoreBreakdown": {
    "keywordMatching": number,
    "education": number,
    "experience": number,
    "technicalSkills": number,
    "format": number
  },
  "keywordAnalysis": [
    {
      "keyword": "string",
      "status": "matched" | "missing" | "added",
      "importance": "high" | "medium" | "low"
    }
  ],
  "suggestions": [
    {
      "type": "skill" | "experience" | "format" | "education",
      "current": "string",
      "suggested": "string",
      "reason": "string"
    }
  ],
  "optimizedSections": {
    "summary": "string",
    "skills": "string", 
    "experience": "string"
  }
}`
          },
          {
            role: 'user',
            content: `Analyze this resume against the job description and provide a detailed ATS score calculation with breakdown.

RESUME CONTENT:
${resume}

JOB DESCRIPTION:
${jobDescription}

Please carefully analyze educational qualifications using the equivalency guide provided. Calculate the ATS score using the structured criteria and provide the breakdown for each category.`
          }
        ],
        max_tokens: 3000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('OpenAI response:', analysisText);
    
    // Try to parse JSON from the response
    try {
      // Look for JSON in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Validate that we have a proper ATS score
        if (typeof result.atsScore !== 'number' || result.atsScore < 0 || result.atsScore > 100) {
          result.atsScore = 65; // Default fallback
        }
        
        // Ensure scoreBreakdown exists
        if (!result.scoreBreakdown) {
          result.scoreBreakdown = {
            keywordMatching: Math.round(result.atsScore * 0.4),
            education: Math.round(result.atsScore * 0.2),
            experience: Math.round(result.atsScore * 0.25),
            technicalSkills: Math.round(result.atsScore * 0.1),
            format: Math.round(result.atsScore * 0.05)
          };
        }
        
        console.log('Parsed result with ATS score:', result.atsScore);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Fallback: create a basic response with calculated score
      const resumeWords = resume.toLowerCase().split(/\s+/);
      const jobWords = jobDescription.toLowerCase().split(/\s+/);
      
      // Simple keyword matching for fallback score
      const commonWords = resumeWords.filter(word => 
        word.length > 3 && jobWords.includes(word)
      );
      const matchPercentage = Math.min((commonWords.length / Math.max(jobWords.length * 0.1, 1)) * 100, 100);
      const calculatedScore = Math.round(Math.max(matchPercentage, 30));
      
      const fallbackResult = {
        atsScore: calculatedScore,
        scoreBreakdown: {
          keywordMatching: Math.round(calculatedScore * 0.4),
          education: Math.round(calculatedScore * 0.2),
          experience: Math.round(calculatedScore * 0.25),
          technicalSkills: Math.round(calculatedScore * 0.1),
          format: Math.round(calculatedScore * 0.05)
        },
        keywordAnalysis: [
          { keyword: "Analysis completed", status: "matched", importance: "high" },
          { keyword: "Keywords identified", status: "matched", importance: "medium" }
        ],
        suggestions: [
          { 
            type: "format", 
            current: "Current resume format", 
            suggested: "ATS-optimized format", 
            reason: "Improve ATS compatibility and keyword matching" 
          }
        ],
        optimizedSections: {
          summary: "Professional summary optimized for ATS scanning with relevant keywords from the job description.",
          skills: "Technical and soft skills section enhanced with job-specific requirements and industry keywords.",
          experience: "Experience section reformatted with action verbs and quantified achievements that match job requirements."
        },
        rawAnalysis: analysisText
      };
      
      console.log('Using fallback result with score:', calculatedScore);
      
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      atsScore: 0,
      scoreBreakdown: {
        keywordMatching: 0,
        education: 0,
        experience: 0,
        technicalSkills: 0,
        format: 0
      },
      keywordAnalysis: [],
      suggestions: [],
      optimizedSections: {
        summary: "",
        skills: "",
        experience: ""
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
