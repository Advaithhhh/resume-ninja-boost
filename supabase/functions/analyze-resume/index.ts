
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
            content: `You are an expert ATS (Applicant Tracking System) analyzer and resume optimization specialist. 

Your task is to:
1. Calculate a realistic ATS score (0-100) based on keyword matching, formatting, and relevance
2. Identify matched, missing, and suggested keywords
3. Provide specific optimization suggestions
4. Generate optimized resume sections

Return ONLY a valid JSON response with this exact structure:
{
  "atsScore": number (0-100, calculated based on actual analysis),
  "keywordAnalysis": [
    {
      "keyword": "string",
      "status": "matched" | "missing" | "added",
      "importance": "high" | "medium" | "low"
    }
  ],
  "suggestions": [
    {
      "type": "skill" | "experience" | "format",
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
}

Calculate the ATS score based on:
- Keyword match percentage (40% weight)
- Required skills coverage (30% weight)
- Experience relevance (20% weight)
- Format and structure (10% weight)`
          },
          {
            role: 'user',
            content: `Analyze this resume against the job description and provide a detailed ATS score calculation and optimization.

RESUME CONTENT:
${resume}

JOB DESCRIPTION:
${jobDescription}

Calculate a realistic ATS score based on actual keyword matching and relevance. Provide specific keyword analysis and actionable optimization suggestions.`
          }
        ],
        max_tokens: 2500,
        temperature: 0.2
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
