import { SAMPLE_QUESTIONS_BANK } from '../mock/mockData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const GEMINI_API_KEY_STORAGE = 'interviewiq_gemini_api_key';

// Automatically clean up any legacy client-side API keys to protect user credentials
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
} catch {
  // Ignore in non-browser environments
}

/**
 * @deprecated Client-side API key access has been removed for security.
 * All AI provider credentials are kept exclusively on the backend server.
 */
export function getGeminiApiKey() {
  return '';
}

/**
 * @deprecated Storing provider API keys in browser localStorage is disabled.
 * Configure GEMINI_API_KEY on the backend server environment.
 */
export function setGeminiApiKey(key) {
  if (key) {
    console.warn('[Security] Browser storage of provider API keys is disabled. Configure GEMINI_API_KEY on the backend server.');
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch {
    // Ignore in non-browser environments
  }
}

/**
 * Generate dynamic interview questions tailored to role, difficulty, resume, and past answers.
 * Proxies to the backend server or uses the smart offline question engine.
 */
export async function generateQuestion({ roleId, difficulty, resumeData, pastQA = [], questionIndex = 0 }) {
  const token = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('interviewiq_token') : null;

  // If user is authenticated, attempt question generation via secure backend API
  if (token) {
    try {
      const res = await fetch(`${API_URL}/interviews/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: roleId,
          role: roleId,
          difficulty,
          resumeData,
          totalQuestions: 10,
          questionIndex
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.question) {
          return data.question;
        }
      }
    } catch (err) {
      console.warn('Backend interview generation unreachable, using intelligent offline engine:', err);
    }
  }

  // Smart Simulated Fallback AI Engine (Deterministic offline questions)
  return generateFallbackQuestion({ roleId, difficulty, resumeData, pastQA, questionIndex });
}

function generateFallbackQuestion({ roleId, difficulty, resumeData, pastQA, questionIndex }) {
  // Check if candidate has projects in resume and it's early in interview
  if (resumeData && resumeData.extractedProjects?.length > 0 && questionIndex === 1) {
    const proj = resumeData.extractedProjects[0];
    return {
      id: `q-res-${Date.now()}`,
      question: `I noticed on your resume that you built "${proj.name}". Could you describe the architecture, key technical challenges you faced, and why you selected ${proj.tech}?`,
      type: 'conceptual',
      topics: ['Project Deep Dive', 'Architecture', ...(proj.tech ? proj.tech.split(', ') : [])],
      expectedKeywords: ['architecture', 'tradeoffs', 'challenges', 'performance', 'scaling'],
      codingPrompt: null
    };
  }

  // Tailored question bank lookup with follow-up variation
  const bank = SAMPLE_QUESTIONS_BANK[roleId] || SAMPLE_QUESTIONS_BANK['backend'] || [];
  const baseQ = bank[questionIndex % (bank.length || 1)] || {
    id: `q-fallback-${questionIndex}`,
    question: 'Describe a complex technical challenge you solved recently.',
    type: 'conceptual',
    topics: ['Problem Solving'],
    expectedKeywords: ['problem', 'solution', 'outcome'],
    codingPrompt: null
  };

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
 * Multi-dimensional AI Evaluation Engine.
 * Evaluates candidate answers via secure backend AI service or deterministic offline evaluator.
 */
export async function evaluateAnswer({ question, answer, code, roleId, difficulty, metrics = {} }) {
  const token = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('interviewiq_token') : null;

  // If user is authenticated and question exists, attempt evaluation via secure backend API
  if (token && question?.id) {
    try {
      const res = await fetch(`${API_URL}/interviews/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          questionId: question.id,
          questionText: question.question,
          idealAnswer: question.idealAnswer,
          expectedKeywords: question.expectedKeywords || [],
          answer,
          code,
          metrics,
          category: roleId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.evaluation) {
          return data.evaluation;
        }
      }
    } catch (err) {
      console.warn('Backend evaluation call failed, falling back to simulated evaluator:', err);
    }
  }

  return generateFallbackEvaluation({ question, answer, code, metrics });
}

function generateFallbackEvaluation({ question, answer = '', code = '', metrics = {} }) {
  const words = (answer + ' ' + code).trim().split(/\s+/).filter(Boolean).length;
  const keywords = question?.expectedKeywords || ['architecture', 'performance', 'data', 'system', 'design'];
  
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

  let readinessLevel = 'PROFICIENT';
  let verdict = 'Proficient';
  if (overall >= 8.5) {
    readinessLevel = 'EXEMPLARY';
    verdict = 'Exemplary Mastery';
  } else if (overall < 5.5) {
    readinessLevel = 'FOUNDATIONAL';
    verdict = 'Needs Practice';
  } else if (overall < 7.0) {
    readinessLevel = 'DEVELOPING';
    verdict = 'Developing';
  }

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
  if ((metrics.fillerCount || 0) > 3) improvements.push(`Speech Coaching: Reduce filler phrase usage (detected ${metrics.fillerCount} filler words).`);

  return {
    accuracy: Number(accuracy.toFixed(1)),
    communication: Number(comm.toFixed(1)),
    confidence: Number(conf.toFixed(1)),
    depth: Number(depth.toFixed(1)),
    examples: Number(examples.toFixed(1)),
    overall,
    readinessLevel,
    verdict,
    strengths,
    improvements: improvements.length ? improvements : ['Elaborate on production failure recovery strategies.'],
    detailedFeedback: `You addressed "${(question?.question || '').substring(0, 50)}..." effectively. Your answer demonstrated solid grasp of the core concepts, scoring an overall ${overall}/10.`,
    disclaimer: 'Formative AI practice feedback for candidate development. Not an automated hiring decision.'
  };
}
