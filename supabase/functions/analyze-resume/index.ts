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

Return ONLY valid JSON with this structure:
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
        max_tokens: 3000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('OpenAI response:', analysisText);
    
    try {
      const cleanedResponse = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Validate and ensure proper structure for atsScore
        if (typeof result.atsScore !== 'number' || result.atsScore < 0 || result.atsScore > 100) {
          console.log('ATS score from OpenAI is invalid, missing, or out of range. Defaulting to 0.');
          result.atsScore = 0; 
        }
        // Ensure score is clamped between 0 and 100 if it was a number but out of typical range.
        result.atsScore = Math.max(0, Math.min(100, result.atsScore));


        // Ensure scoreBreakdown exists and is based on the (potentially new) atsScore
        if (!result.scoreBreakdown || 
            (result.scoreBreakdown.keywordMatch + 
             result.scoreBreakdown.experienceRelevance + 
             result.scoreBreakdown.educationMatch + 
             result.scoreBreakdown.skillsCoverage !== result.atsScore) ) {
          // If breakdown is missing or doesn't sum up, recalculate based on current atsScore
          result.scoreBreakdown = {
            keywordMatch: Math.round(result.atsScore * 0.4),
            experienceRelevance: Math.round(result.atsScore * 0.25),
            educationMatch: Math.round(result.atsScore * 0.2),
            skillsCoverage: Math.round(result.atsScore * 0.15)
          };
        }
        
        // Ensure all required arrays exist
        result.keywordAnalysis = result.keywordAnalysis || [];
        result.suggestions = result.suggestions || [];
        result.missingElements = result.missingElements || [];
        
        console.log('Successfully parsed result with ATS score:', result.atsScore);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Attempting fallback analysis...');
      
      const resumeLower = resume.toLowerCase();
      const jobLower = jobDescription.toLowerCase();
      
      const jobWords = jobLower.split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));
      
      const matches = jobWords.filter(word => resumeLower.includes(word));
      const matchPercentage = jobWords.length > 0 ? Math.min((matches.length / Math.max(jobWords.length * 0.3, 1)) * 100, 100) : 0;
      
      const baseScore = matchPercentage; // Can be 0
      const educationBonus = (resumeLower.includes('bachelor') || resumeLower.includes('btech') || resumeLower.includes('degree')) ? 10 : 0;
      const experienceBonus = (resumeLower.includes('experience') || resumeLower.includes('worked') || resumeLower.includes('developed')) ? 10 : 0;
      
      const calculatedScore = Math.max(0, Math.min(Math.round(baseScore + educationBonus + experienceBonus), 100)); // Ensure 0-100 range
      
      const fallbackResult = {
        atsScore: calculatedScore,
        scoreBreakdown: {
          keywordMatch: Math.round(calculatedScore * 0.4),
          experienceRelevance: Math.round(calculatedScore * 0.25),
          educationMatch: Math.round(calculatedScore * 0.2),
          skillsCoverage: Math.round(calculatedScore * 0.15)
        },
        keywordAnalysis: matches.slice(0, 10).map(keyword => ({
          keyword: keyword,
          status: "matched",
          importance: "medium",
          foundAs: keyword
        })),
        suggestions: [
          { 
            type: "skill", 
            priority: "high",
            current: "Current skill set", 
            suggested: "Add more job-specific technical skills and certifications", 
            reason: "Increase keyword density and technical alignment with job requirements",
            impact: "Could improve score by 10-15 points"
          },
          {
            type: "experience",
            priority: "medium", 
            current: "Current experience format",
            suggested: "Quantify achievements with specific metrics and results",
            reason: "ATS systems favor measurable accomplishments",
            impact: "Could improve score by 5-10 points"
          }
        ],
        optimizedSections: {
          summary: "Results-driven professional with strong technical background and proven track record in delivering high-quality solutions. Experienced in modern technologies and methodologies with focus on continuous improvement and innovation.",
          skills: "Technical Skills: Modern programming languages, frameworks, and development tools. Soft Skills: Problem-solving, teamwork, communication, project management, analytical thinking.",
          experience: "• Developed and implemented technical solutions resulting in improved efficiency and performance\n• Collaborated with cross-functional teams to deliver projects on time and within budget\n• Applied best practices and modern methodologies to ensure high-quality deliverables"
        },
        missingElements: [
          "More specific technical skills mentioned in job description",
          "Quantified achievements and impact metrics",
          "Industry-specific keywords and terminology"
        ],
        rawAnalysis: analysisText
      };
      
      console.log('Using intelligent fallback result with score:', calculatedScore);
      
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
        keywordMatch: 0,
        experienceRelevance: 0,
        educationMatch: 0,
        skillsCoverage: 0
      },
      keywordAnalysis: [],
      suggestions: [],
      optimizedSections: {
        summary: "",
        skills: "",
        experience: ""
      },
      missingElements: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
