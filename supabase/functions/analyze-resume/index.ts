
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

    if (!resume || !jobDescription) {
      return new Response(JSON.stringify({ error: "Missing resume or job description" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing resume with length:', resume.length);
    console.log('Job description length:', jobDescription.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using a more robust model
        messages: [
          {
            role: 'system',
            content: `You are an expert ATS (Applicant Tracking System) analyzer with deep understanding of resume parsing and job matching. Your task is to provide accurate, intelligent analysis.

IMPORTANT EDUCATION MAPPINGS:
- "BTech", "B.Tech", "Bachelor of Technology" = Bachelor's degree
- "MTech", "M.Tech", "Master of Technology" = Master's degree  
- "BE", "B.E.", "Bachelor of Engineering" = Bachelor's degree
- "ME", "M.E.", "Master of Engineering" = Master's degree
- "BSc", "B.Sc", "Bachelor of Science" = Bachelor's degree
- "MSc", "M.Sc", "Master of Science" = Master's degree
- "MBA", "Master of Business Administration" = Master's degree
- "PhD", "Ph.D", "Doctorate" = Doctoral degree

SKILL SYNONYMS TO RECOGNIZE:
- "JS" = "JavaScript" 
- "React.js" = "React"
- "Node.js" = "Node"
- "ML" = "Machine Learning"
- "AI" = "Artificial Intelligence"
- "DB" = "Database"
- "SQL" = "Database", "MySQL", "PostgreSQL"
- "Frontend" = "Front-end", "UI Development"
- "Backend" = "Back-end", "Server-side"
- "Fullstack" = "Full-stack", "Full stack"

INTELLIGENT ATS SCORING METHODOLOGY:
1. Keyword Match Score (40 points): Exact + semantic matches from job requirements
2. Experience Relevance (25 points): Years of experience + role alignment
3. Education Match (20 points): Degree level + field relevance
4. Skills Coverage (15 points): Technical + soft skills alignment

ANALYSIS REQUIREMENTS:
- Extract ALL keywords from job description (skills, technologies, qualifications, experience levels)
- Find exact matches, synonyms, and semantically related terms in resume
- Calculate realistic percentages based on actual content overlap
- Provide specific, actionable optimization suggestions
- Generate professional, ATS-optimized content sections
- When generating suggestions, if the 'current' field refers to resume content that is poorly formatted or difficult to parse, use a descriptive placeholder like 'Original section has formatting issues' or 'Content difficult to interpret' instead of generic terms such as 'unreadable content'.

You MUST return ONLY a valid JSON object with this exact structure:
{
  "atsScore": number (calculated based on methodology above),
  "scoreBreakdown": {
    "keywordMatch": number,
    "experienceRelevance": number, 
    "educationMatch": number,
    "skillsCoverage": number
  },
  "keywordAnalysis": [
    {
      "keyword": "string",
      "status": "matched" | "missing" | "partial",
      "importance": "high" | "medium" | "low",
      "foundAs": "string or null (if matched/partial)"
    }
  ],
  "suggestions": [
    {
      "type": "skill" | "experience" | "education" | "format",
      "priority": "high" | "medium" | "low",
      "current": "string",
      "suggested": "string", 
      "reason": "string",
      "impact": "string (expected ATS score improvement)"
    }
  ],
  "optimizedSections": {
    "summary": "string (professional summary with job-specific keywords)",
    "skills": "string (comprehensive skills list matching job requirements)",
    "experience": "string (enhanced experience descriptions with quantified achievements)"
  },
  "missingElements": [
    "string (critical missing requirements from job description)"
  ]
}`
          },
          {
            role: 'user',
            content: `Analyze this resume against the job description with intelligent matching and accurate scoring.

RESUME CONTENT:
${resume}

JOB DESCRIPTION:
${jobDescription}

Provide detailed analysis with:
1. Accurate ATS score based on actual content comparison
2. Comprehensive keyword analysis (find synonyms and related terms)
3. Specific improvement suggestions with expected impact (remember to handle poorly formatted 'current' sections gracefully)
4. Professional optimized content that matches job requirements
5. Clear identification of missing critical elements

Be thorough in finding matches - look for synonyms, abbreviations, and related concepts. Calculate scores based on real overlap between resume and job requirements.`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" } // Enforcing JSON output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`Analysis service failed with status ${response.status}.`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenAI response structure:', JSON.stringify(data));
      throw new Error('Analysis service returned an invalid response structure.');
    }
    
    const analysisText = data.choices[0].message.content;
    
    console.log('OpenAI response received.');
    
    try {
      const result = JSON.parse(analysisText);
      
      if (typeof result.atsScore !== 'number' || result.atsScore < 0 || result.atsScore > 100) {
        console.log('ATS score from OpenAI is invalid, missing, or out of range. Defaulting to 0.');
        result.atsScore = 0; 
      }
      result.atsScore = Math.round(Math.max(0, Math.min(100, result.atsScore)));

      if (!result.scoreBreakdown || typeof result.scoreBreakdown !== 'object') {
          result.scoreBreakdown = {};
      }
      const currentTotal = (result.scoreBreakdown.keywordMatch || 0) + (result.scoreBreakdown.experienceRelevance || 0) + (result.scoreBreakdown.educationMatch || 0) + (result.scoreBreakdown.skillsCoverage || 0);

      if (Math.round(currentTotal) !== result.atsScore) {
        console.log("Recalculating score breakdown as it doesn't match total ATS score.");
        result.scoreBreakdown = {
          keywordMatch: Math.round(result.atsScore * 0.4),
          experienceRelevance: Math.round(result.atsScore * 0.25),
          educationMatch: Math.round(result.atsScore * 0.2),
          skillsCoverage: Math.round(result.atsScore * 0.15)
        };
      }
      
      result.keywordAnalysis = result.keywordAnalysis || [];
      result.suggestions = result.suggestions || [];
      result.missingElements = result.missingElements || [];
      result.optimizedSections = result.optimizedSections || { summary: "", skills: "", experience: "" };
      
      console.log('Successfully parsed result with ATS score:', result.atsScore);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw text that failed parsing:', analysisText);
      throw new Error("Failed to parse the JSON response from the analysis service.");
    }
  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(JSON.stringify({ 
      error: `Failed to process analysis request: ${error.message}`,
      atsScore: 0,
      scoreBreakdown: { keywordMatch: 0, experienceRelevance: 0, educationMatch: 0, skillsCoverage: 0 },
      keywordAnalysis: [],
      suggestions: [],
      optimizedSections: { summary: "", skills: "", experience: "" },
      missingElements: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
