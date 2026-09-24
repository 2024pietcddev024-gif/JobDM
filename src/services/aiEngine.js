import { SAMPLE_QUESTIONS_BANK } from '../mock/mockData';

// Storage key for user's Gemini API Key
const GEMINI_API_KEY_STORAGE = 'interviewiq_gemini_api_key';

export function getGeminiApiKey() {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
}

export function setGeminiApiKey(key) {
  if (key) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
}

/**
 * Generate dynamic interview questions tailored to role, difficulty, resume, and past answers
 */
export async function generateQuestion({ roleId, difficulty, resumeData, pastQA = [], questionIndex = 0 }) {
  const apiKey = getGeminiApiKey();

  // If user provided a Gemini API Key, attempt live Gemini API call
  if (apiKey) {
    try {
      return await callGeminiForQuestion({ apiKey, roleId, difficulty, resumeData, pastQA, questionIndex });
    } catch (err) {
      console.warn('Gemini API call failed, falling back to intelligent offline engine:', err);
    }
  }

  // Smart Simulated Fallback AI Engine
  return generateFallbackQuestion({ roleId, difficulty, resumeData, pastQA, questionIndex });
}

async function callGeminiForQuestion({ apiKey, roleId, difficulty, resumeData, pastQA, questionIndex }) {
  const prompt = `You are a senior hiring manager and tech lead interviewing a candidate for a ${roleId} role at difficulty level ${difficulty}.
${resumeData ? `Candidate Resume Context: Skills [${resumeData.extractedSkills?.join(', ')}], Projects [${resumeData.extractedProjects?.map(p => p.name).join(', ')}]` : ''}
Past Questions Asked: ${pastQA.map(item => item.question).join(' | ')}
Question Number: ${questionIndex + 1} of 10.

Generate the NEXT interview question. It should feel conversational, realistic, and adapt to the candidate's background. If question index is 1 and resume contains projects, ask specifically about one of their projects. If it is a coding question, provide a code starter template.

Return JSON in this format ONLY:
{
  "question": "The question text",
  "type": "conceptual" or "coding" or "behavioral",
  "topics": ["topic1", "topic2"],
  "expectedKeywords": ["keyword1", "keyword2"],
  "codingPrompt": null or "// starter code string"
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

function generateFallbackQuestion({ roleId, difficulty, resumeData, pastQA, questionIndex }) {
  // Check if candidate has projects in resume and it's early in interview
  if (resumeData && resumeData.extractedProjects?.length > 0 && questionIndex === 1) {
    const proj = resumeData.extractedProjects[0];
    return {
      id: `q-res-${Date.now()}`,
      question: `I noticed on your resume that you built "${proj.name}". Could you describe the architecture, key technical challenges you faced, and why you selected ${proj.tech}?`,
      type: 'conceptual',
      topics: ['Project Deep Dive', 'Architecture', ...proj.tech.split(', ')],
      expectedKeywords: ['architecture', 'tradeoffs', 'challenges', 'performance', 'scaling'],
      codingPrompt: null
    };
  }

  // Tailored question bank lookup with follow-up variation
  const bank = SAMPLE_QUESTIONS_BANK[roleId] || SAMPLE_QUESTIONS_BANK['backend'];
  const baseQ = bank[questionIndex % bank.length];

  // Add dynamic follow-up context if past QA exists
  if (pastQA.length > 0 && questionIndex > 0) {
    const lastQA = pastQA[pastQA.length - 1];
    return {
      ...baseQ,
      id: `q-dyn-${Date.now()}`,
      question: `Following up on your answer about ${lastQA.topics?.[0] || 'your previous point'}: ${baseQ.question}`
    };
  }

  return {
    ...baseQ,
    id: `q-dyn-${Date.now()}`
  };
}

/**
 * Multi-dimensional AI Evaluation Engine
 */
export async function evaluateAnswer({ question, answer, code, roleId, difficulty, metrics = {} }) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      return await callGeminiForEvaluation({ apiKey, question, answer, code, roleId, metrics });
    } catch (err) {
      console.warn('Gemini API evaluation call failed, falling back to simulated evaluator:', err);
    }
  }

  return generateFallbackEvaluation({ question, answer, code, metrics });
}

async function callGeminiForEvaluation({ apiKey, question, answer, code, roleId, metrics }) {
  const prompt = `You are an expert AI Interview Evaluator. Evaluate the candidate's answer.
Question: "${question.question}"
Candidate Answer: "${answer || 'No spoken answer provided'}"
Candidate Code: "${code || 'N/A'}"
Speech Metrics: WPM: ${metrics.wpm || 'Normal'}, Filler Words Count: ${metrics.fillerCount || 0}.

Score each area from 1.0 to 10.0:
1. Technical Accuracy
2. Communication Clarity
3. Confidence & Tone
4. Depth of Knowledge
5. Practical Examples Used

Return JSON ONLY:
{
  "accuracy": 8.5,
  "communication": 8.0,
  "confidence": 7.5,
  "depth": 8.0,
  "examples": 7.0,
  "overall": 7.8,
  "verdict": "Strong Hire" | "Hire" | "Weak Hire" | "Needs Practice",
  "strengths": ["Clear explanation of X", "Good code structure"],
  "improvements": ["Mentioned Y but omitted Z", "Include concrete metrics"],
  "detailedFeedback": "Paragraph analyzing candidate performance."
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) throw new Error('Evaluation call failed');
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

function generateFallbackEvaluation({ question, answer = '', code = '', metrics = {} }) {
  const words = (answer + ' ' + code).trim().split(/\s+/).filter(Boolean).length;
  const keywords = question.expectedKeywords || ['architecture', 'performance', 'data', 'system', 'design'];
  
  let keywordHits = 0;
  keywords.forEach(kw => {
    if (answer.toLowerCase().includes(kw.toLowerCase()) || code.toLowerCase().includes(kw.toLowerCase())) {
      keywordHits++;
    }
  });

  const accuracy = Math.min(9.8, Math.max(5.5, (keywordHits / Math.max(1, keywords.length)) * 4.5 + 5.0));
  const lengthBonus = Math.min(2.0, words / 40);
  const fillerPenalty = Math.min(1.5, (metrics.fillerCount || 0) * 0.3);
  
  const comm = Math.min(9.5, Math.max(6.0, 7.5 + lengthBonus - fillerPenalty));
  const conf = Math.min(9.5, Math.max(6.5, 8.0 - fillerPenalty));
  const depth = Math.min(9.8, Math.max(5.0, accuracy * 0.9 + (code ? 1.0 : 0.4)));
  const examples = Math.min(9.5, Math.max(4.5, keywordHits > 1 ? 8.2 : 5.5));
  
  const overall = Number(((accuracy * 0.35) + (comm * 0.2) + (conf * 0.15) + (depth * 0.2) + (examples * 0.1)).toFixed(1));

  let verdict = 'Hire';
  if (overall >= 8.5) verdict = 'Strong Hire';
  else if (overall < 7.0) verdict = 'Needs Practice';

  const strengths = [];
  if (keywordHits > 1) strengths.push(`Mentioned core concepts like ${keywords.slice(0, 2).join(', ')}.`);
  if (words > 30) strengths.push('Structured response with comprehensive length and detail.');
  if ((metrics.fillerCount || 0) <= 2) strengths.push('Fluent delivery with minimal filler words.');

  const improvements = [];
  if (keywordHits < keywords.length) {
    const missing = keywords.filter(k => !answer.toLowerCase().includes(k.toLowerCase())).slice(0, 2);
    if (missing.length > 0) improvements.push(`Consider explicitly discussing ${missing.join(' and ')}.`);
  }
  if (words < 25) improvements.push('Expand further on real-world edge cases and concrete examples.');
  if ((metrics.fillerCount || 0) > 3) improvements.push(`Reduce filler phrase usage (detected ${metrics.fillerCount} filler words).`);

  return {
    accuracy: Number(accuracy.toFixed(1)),
    communication: Number(comm.toFixed(1)),
    confidence: Number(conf.toFixed(1)),
    depth: Number(depth.toFixed(1)),
    examples: Number(examples.toFixed(1)),
    overall,
    verdict,
    strengths,
    improvements: improvements.length ? improvements : ['Elaborate on production failure recovery strategies.'],
    detailedFeedback: `You addressed "${question.question.substring(0, 50)}..." effectively. Your answer demonstrated solid grasp of the core concepts, scoring an overall ${overall}/10.`
  };
}
