import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWrapperCode } from './executionWrappers.js';
import db from '../db.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const isValidGeminiKey = GEMINI_KEY && (GEMINI_KEY.startsWith('AIza') || GEMINI_KEY.startsWith('AQ.'));
const genAI = isValidGeminiKey ? new GoogleGenerativeAI(GEMINI_KEY) : null;

if (GEMINI_KEY && !isValidGeminiKey) {
  console.warn('[AI Engine] GEMINI_API_KEY looks invalid. Falling back to offline question bank.');
}

const REFERENCE_SOLUTIONS = {
  'Two Sum': {
    'Python': `def solve(input):\n    nums = input['nums']\n    target = input['target']\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []`,
    'Java': `class Solution {\n    public Object solve(Object input) {\n        // Assume mapping input properly\n        return null;\n    }\n}`
  },
  'Reverse String': {
    'Python': `def solve(input):\n    return input[::-1]`
  }
};

// Map any incoming category string → our fallback bank key
function categoryToKey(category = '') {
  const c = category.toLowerCase().trim();
  if (c.includes('backend') || c.includes('node') || c.includes('server')) return 'backend';
  if (c.includes('frontend') || c.includes('react') || c.includes('ui')) return 'frontend';
  if (c.includes('system') || c.includes('design')) return 'system-design';
  if (c.includes('hr') || c.includes('behav') || c.includes('soft skill')) return 'hr';
  if (c.includes('ai') || c.includes('ml') || c.includes('machine')) return 'aiml';
  if (c.includes('data science') || c.includes('analytics') || c.includes('statistic')) return 'datascience';
  if (c.includes('data') || c.includes('sql') || c.includes('database')) return 'datascience';
  if (c.includes('devops') || c.includes('cloud') || c.includes('aws') || c.includes('docker')) return 'devops';
  if (c.includes('software') || c.includes('algorithm') || c.includes('dsa') || c.includes('general')) return 'software';
  return 'backend';
}

function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  let intersection = 0;
  for (let w of words1) if (words2.has(w)) intersection++;
  const union = words1.size + words2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function analyzeResume(fileData, mimeType) {
  if (!genAI || !fileData) {
    return {
      skills: [],
      projects: [],
      categories: [],
      programmingLanguages: [],
      roles: [],
      experienceLevel: 'Unknown'
    };
  }
  
  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `You are an expert technical recruiter analyzing a resume. 
Extract the following information from the provided resume document.
Return ONLY valid JSON with this exact structure (no markdown, no backticks):
{
  "skills": ["skill1", "skill2"],
  "projects": ["project1", "project2"],
  "categories": ["backend", "frontend"], 
  "programmingLanguages": ["Python", "Java"],
  "roles": ["Software Engineer"],
  "experienceLevel": "Junior"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileData,
          mimeType: mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword' ? 'text/plain' : mimeType
        }
      }
    ]);
    let text = result.response.text();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('[Diagnostic] [AI Engine] analyzeResume error:', err);
    throw err;
  }
}

export async function generateQuestion({ category, role, difficulty, resumeData, pastQA = [], questionIndex = 0, codingLanguage }) {
  const askedQuestionsText = pastQA.map(q => {
    if (typeof q === 'string') return q.toLowerCase().trim();
    return (q.question_text || q.question || '').toLowerCase().trim();
  });
  
  const historyText = pastQA.map((q, i) => {
    if (typeof q === 'string') return `Q${i+1}: ${q}`;
    let res = `Q${i+1}: ${q.question_text || q.question || ''}`;
    if (q.answer) res += `\nCandidate's Answer: ${q.answer}`;
    return res;
  }).join('\n\n');

  if (!genAI) {
    return generateFallbackQuestion({ category, role, difficulty, codingLanguage, pastQA: askedQuestionsText, questionIndex });
  }

  let attempts = 0;
  let lastError = null;
  let failedAttempts = [];

  while (attempts < 3) {
    attempts++;
    try {
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      const model = genAI.getGenerativeModel({ model: modelName, temperature: 0.7 + (attempts * 0.1) });
      
      let categoryFocusPrompt = '';
      if (resumeData && (category || role)) {
         categoryFocusPrompt = `INTERVIEW BASIS: RESUME + SELECTED DOMAIN. The selected domain is ${category || role}. You MUST prioritize generating questions that combine BOTH the candidate's actual resume experience AND the selected domain. Do NOT ignore the resume. Do NOT ignore the selected domain. ${codingLanguage ? `The selected language is ${codingLanguage}. ` : ''}${difficulty ? `The experience level is ${difficulty}. ` : ''}IMPORTANT: DO NOT invent technologies, projects, or experience not present in the resume.`;
      } else if (resumeData && !category && !role) {
         categoryFocusPrompt = `INTERVIEW BASIS: RESUME. This is a strictly resume-based interview. The interview MUST be generated primarily and strictly from the uploaded resume content (skills, projects, experience). ${codingLanguage ? `The selected language is ${codingLanguage}. ` : ''}${difficulty ? `The experience level is ${difficulty}. ` : ''}IMPORTANT: DO NOT invent technologies, projects, or experience not present in the resume.`;
      } else if (!resumeData && (category || role)) {
         categoryFocusPrompt = `INTERVIEW BASIS: SELECTED DOMAIN. Generate the interview based strictly on the selected domain: ${category || role}. ${codingLanguage ? `The selected language is ${codingLanguage}. ` : ''}${difficulty ? `The experience level is ${difficulty}. ` : ''}`;
      } else {
         categoryFocusPrompt = `INTERVIEW BASIS: GENERAL. ${codingLanguage ? `The selected language is ${codingLanguage}. ` : ''}${difficulty ? `The experience level is ${difficulty}. ` : ''}`;
      }

      const roleText = (role || category) ? `${role || category} ` : '';
      const difficultyText = difficulty ? `${difficulty} level ` : '';
      const introLine = (difficultyText || roleText) 
         ? `You are an expert technical interviewer for a ${difficultyText}${roleText}interview.`
         : `You are an expert technical interviewer.`;
         
      let resumeContext = '';
      if (resumeData) {
        const skills = [...(resumeData.extractedSkills || resumeData.skills || []), ...(resumeData.programmingLanguages || [])].join(', ');
        const projects = (resumeData.extractedProjects || resumeData.projects || []).map(p => typeof p === 'string' ? p : p.name).join(', ');
        resumeContext = `Candidate Resume Context:\n- Skills & Technologies: [${skills}]\n- Projects & Experience: [${projects}]\n- Roles: [${(resumeData.roles || []).join(', ')}]`;
      }
      
      let prompt = `${introLine}
${resumeContext}

${categoryFocusPrompt}

INTERVIEW HISTORY SO FAR:
${historyText.length > 0 ? historyText : 'None. This is the first question.'}

Question number: ${questionIndex + 1} of 10.

CRITICAL RULES:
1. DO NOT repeat any previously asked question or ask a semantically equivalent question.
2. If this is a follow-up, use the Candidate's Answer from the previous question to dive deeper.
3. Generate a UNIQUE interview question that is semantically DIFFERENT from all previously asked questions.
4. Vary the type: conceptual, coding, problem-solving, debugging, or behavioral. Make it specific and realistic.
5. Topics must remain strictly within the scope of ${category || role || 'the resume'}.
${codingLanguage ? `6. If you generate a coding question, ensure it explicitly specifies that it should be solved in ${codingLanguage}, and provide a relevant coding starter template in ${codingLanguage}.` : ''}

${failedAttempts.length > 0 ? `WARNING: You previously generated these questions which were REJECTED as duplicates. DO NOT generate these again:\n${failedAttempts.join('\n')}\n\n` : ''}Return ONLY valid JSON (no markdown, no backticks) matching this structure:
{
  "question": "The question text here",
  "topic": "The core topic (e.g. REST API)",
  "type": "conceptual", // conceptual, coding, or behavioral
  "difficulty": "${difficulty || 'Infer from resume or default to Intermediate'}",
  "expectedKeywords": ["keyword1", "keyword2"],
  "codingPrompt": null, // If type is "coding", put the starter code string here. Otherwise null.
  "idealAnswer": "A comprehensive model answer (3-5 sentences)."
}`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(text);
      if (!parsed.idealAnswer) parsed.idealAnswer = 'See the key topics and expected keywords for guidance.';

      // Duplicate verification
      let isDuplicate = false;
      for (const past of askedQuestionsText) {
        const sim = calculateSimilarity(parsed.question, past);
        if (sim > 0.45 || parsed.question.toLowerCase().includes(past.slice(0, 30)) || past.includes(parsed.question.toLowerCase().slice(0, 30))) {
          isDuplicate = true;
          console.warn(`[AI Engine] Duplicate question generated (similarity ${sim.toFixed(2)}). Retrying...`);
          failedAttempts.push(parsed.question);
          break;
        }
      }

      if (!isDuplicate) {
        // Normalize for frontend format
        parsed.topics = parsed.topics || [parsed.topic].filter(Boolean);
        return parsed;
      }
    } catch (err) {
      lastError = err;
      if (err?.status === 403 || err?.message?.includes('403') || err?.message?.toLowerCase().includes('forbidden')) {
        console.error('[AI Engine] Gemini 403 Forbidden — check API key quota.');
        break; // No point in retrying
      }
      console.warn(`[AI Engine] Error generating question (attempt ${attempts}):`, err?.message || err);
    }
  }

  console.warn('[AI Engine] Max retries reached or fatal error. Using fallback.');
  return generateFallbackQuestion({ category, role, difficulty, codingLanguage, pastQA: askedQuestionsText, questionIndex });
}

// ─── Expanded Fallback Question Bank ─────────────────────────────────────────
const FALLBACK_QUESTIONS = {
  backend: [
    { question: 'Explain the fundamental differences between REST and GraphQL APIs. When would you choose one over the other?', type: 'conceptual', topics: ['REST', 'GraphQL', 'API Design'], expectedKeywords: ['overfetching', 'underfetching', 'schema', 'caching', 'endpoints'], idealAnswer: 'REST uses fixed endpoints and HTTP methods where the server decides the response shape. GraphQL uses a single endpoint where clients specify exactly what data they need, solving overfetching and underfetching. Choose REST for simple CRUD and public APIs; choose GraphQL when multiple clients need different data shapes or when reducing network calls is critical.' },
  ],
  frontend: [
    { question: 'How does React Virtual DOM diffing work? Explain reconciliation and how keys optimize list rendering.', type: 'conceptual', topics: ['React', 'Virtual DOM'], expectedKeywords: ['reconciliation', 'keys', 'fiber', 're-render', 'diffing'], idealAnswer: 'React creates a Virtual DOM — a lightweight JS representation of the real DOM. On state change, React creates a new VDOM, diffs it against the previous one (reconciliation), and only updates changed real DOM nodes. Keys help React identify which list items changed, moved, or were removed — without keys, React re-renders entire lists inefficiently.' },
  ],
  'system-design': [
    { question: 'How would you design a scalable URL shortener like Bitly? Walk through database schema, hash generation, and caching.', type: 'conceptual', topics: ['URL Shortener', 'Hashing', 'Scalability'], expectedKeywords: ['base62', 'redis cache', 'redirection', 'db sharding', 'collision'], idealAnswer: 'Generate a unique short code using base62 encoding of an auto-increment ID or a hash (MD5 truncated). Store mappings in a DB (id, short_code, original_url). Cache hot short_codes in Redis for O(1) lookup. For scale: use consistent hashing for DB sharding, CDN for redirect responses, and a write-through cache strategy.' },
  ],
  hr: [
    { question: 'Tell me about a time you had a technical disagreement with a team member. How did you resolve it?', type: 'behavioral', topics: ['Conflict Resolution', 'Communication'], expectedKeywords: ['situation', 'task', 'action', 'result', 'compromise', 'listen'], idealAnswer: 'Use the STAR method. Describe a specific disagreement (e.g., choice of technology). Explain how you listened to understand their perspective, presented data/evidence for your approach, and found a compromise or deferred to the team\'s decision for the sake of progress. Highlight what you learned from the experience.' },
  ],
  aiml: [
    { question: 'Explain the difference between fine-tuning a foundation model and RAG. When would you choose each?', type: 'conceptual', topics: ['LLMs', 'RAG', 'Fine-tuning'], expectedKeywords: ['embeddings', 'vector db', 'context window', 'hallucination', 'cost', 'domain adaptation'], idealAnswer: 'Fine-tuning trains the model on your domain-specific data to adapt its weights — expensive but produces a model that "knows" your domain style. RAG (Retrieval-Augmented Generation) retrieves relevant documents at inference time and injects them into the prompt — cheaper and keeps knowledge updatable. Use fine-tuning for consistent tone/format; use RAG for dynamic, frequently changing knowledge bases.' },
  ],
  datascience: [
    { question: 'How would you design an A/B test to measure the impact of a new recommendation algorithm on click-through rate?', type: 'conceptual', topics: ['A/B Testing', 'Statistics'], expectedKeywords: ['control group', 'statistical significance', 'p-value', 'sample size', 'bias', 'power'], idealAnswer: 'Randomly split users into control (old algorithm) and treatment (new algorithm) groups. Define the primary metric (CTR). Calculate required sample size using power analysis (typically 80% power, α=0.05). Run the test long enough to account for novelty effects and weekly seasonality. Analyze using a two-proportion z-test. Check for segment interactions and Simpson\'s paradox.' },
  ],
  devops: [
    { question: 'Explain the difference between Docker containers and virtual machines. When would you use each?', type: 'conceptual', topics: ['Docker', 'Virtualization', 'Containers'], expectedKeywords: ['hypervisor', 'OS kernel', 'image', 'lightweight', 'isolation', 'portability'], idealAnswer: 'VMs virtualize hardware and run a full OS on a hypervisor — heavier but stronger isolation. Containers share the host OS kernel, making them much lighter and faster to start. Use VMs for strong isolation or running different OS types. Use containers for microservices, CI/CD pipelines, and consistent environment packaging. Kubernetes orchestrates containers at scale.' },
  ],
  software: [
    { question: 'Explain the difference between BFS and DFS. Describe a real problem where you\'d prefer each.', type: 'conceptual', topics: ['Algorithms', 'Graph Traversal'], expectedKeywords: ['queue', 'stack', 'shortest path', 'cycle detection', 'level order'], idealAnswer: 'BFS (breadth-first) uses a queue, explores level by level — ideal for finding the shortest path in unweighted graphs. DFS (depth-first) uses a stack/recursion, explores as far as possible before backtracking — ideal for detecting cycles, topological sorting, and finding paths in a maze. BFS example: finding shortest route in a city map. DFS example: detecting circular dependencies in a module graph.' },
  ],
};

function generateFallbackQuestion({ category, role, difficulty, pastQA = [], questionIndex = 0, codingLanguage }) {
  const key = categoryToKey(category);
  const bank = FALLBACK_QUESTIONS[key] || FALLBACK_QUESTIONS['backend'];

  // Filter out already-asked questions
  const available = bank.filter(q => {
    return !pastQA.some(asked => {
      let askedText = typeof asked === 'string' ? asked : (asked.question_text || asked.question || '');
      askedText = askedText.toLowerCase();
      const qLower = q.question.toLowerCase();
      const sim = calculateSimilarity(qLower, askedText);
      return sim > 0.45 || qLower.includes(askedText.slice(0, 30)) || askedText.includes(qLower.slice(0, 30));
    });
  });

  // If all questions used, DO NOT repeat!
  if (available.length === 0) {
    // If no questions left in this bank, try getting ANY fallback question not asked
    const allFallbacks = Object.values(FALLBACK_QUESTIONS).flat();
    const anyAvailable = allFallbacks.filter(q => {
      return !pastQA.some(asked => {
        let askedText = typeof asked === 'string' ? asked : (asked.question_text || asked.question || '');
        askedText = askedText.toLowerCase();
        const qLower = q.question.toLowerCase();
        const sim = calculateSimilarity(qLower, askedText);
        return sim > 0.45 || qLower.includes(askedText.slice(0, 30)) || askedText.includes(qLower.slice(0, 30));
      });
    });
    
    if (anyAvailable.length > 0) {
      const q = anyAvailable[0];
      return {
        ...q,
        codingPrompt: q.codingPrompt || null,
        idealAnswer: q.idealAnswer || 'Focus on the expected keywords and key concepts listed in the topics.',
        id: `q-fallback-${Date.now()}`
      };
    } else {
      // Emergency ultimate fallback if we truly exhausted ALL fallback questions (unlikely but possible)
      return {
         question: `Could you elaborate more on your previous experience, specifically focusing on challenges you've faced and how you overcame them? (${Date.now()})`,
         type: 'behavioral',
         topics: ['Experience', 'Challenges'],
         expectedKeywords: ['challenge', 'overcame', 'learned'],
         codingPrompt: null,
         idealAnswer: 'Candidate should describe a specific challenge, the actions they took, and the results.',
         id: `q-fallback-ultimate-${Date.now()}`
      };
    }
  }

  let q = available[questionIndex % available.length];

  if (codingLanguage && q.type === 'coding') {
     q = { ...q, question: q.question + ` Please implement your solution in ${codingLanguage}.` };
  }

  return {
    ...q,
    codingPrompt: q.codingPrompt || null,
    idealAnswer: q.idealAnswer || 'Focus on the expected keywords and key concepts listed in the topics.',
    id: `q-fallback-${Date.now()}`
  };
}

// ─── Evaluation ───────────────────────────────────────────────────────────────
export async function evaluateAnswer({ questionText, idealAnswer, expectedKeywords, answer, code, category, metrics = {} }) {
  const trimmedAnswer = (answer || '').trim();
  const trimmedCode = (code || '').trim();
  const totalWords = (trimmedAnswer + ' ' + trimmedCode).trim().split(/\s+/).filter(Boolean).length;

  // If answer is completely empty → return failing score immediately (no AI call needed)
  if (!trimmedAnswer && !trimmedCode) {
    return {
      accuracy: 0, communication: 0, confidence: 0, depth: 0, examples: 0,
      overall: 0,
      verdict: 'No Answer',
      strengths: [],
      improvements: [
        'No answer was provided for this question.',
        'Practice articulating your thoughts even when unsure — a partial answer is better than silence.',
        idealAnswer ? `Model answer: ${idealAnswer}` : 'Review the core concepts for this topic.'
      ],
      detailedFeedback: 'You did not submit an answer for this question. In a real interview, always attempt to answer — even a partial response shows thought process.',
      idealAnswer: idealAnswer || null
    };
  }

  if (!genAI) {
    return generateFallbackEvaluation({ questionText, idealAnswer, answer: trimmedAnswer, code: trimmedCode, metrics, expectedKeywords });
  }

  try {
    let modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `You are an expert AI Interview Evaluator for a student preparing for technical interviews.
Question: "${questionText}"
Ideal Answer Reference: "${idealAnswer || 'N/A'}"
Expected Keywords: ${expectedKeywords ? (Array.isArray(expectedKeywords) ? expectedKeywords.join(', ') : expectedKeywords) : 'None'}
Candidate Answer: "${trimmedAnswer || 'No spoken answer provided'}"
Candidate Code: "${trimmedCode || 'N/A'}"
Speech Metrics: WPM: ${metrics.wpm || 'N/A'}, Filler Words: ${metrics.fillerCount || 0}.

IMPORTANT SCORING RULES:
- If the candidate provided code, evaluate its time/space complexity, correctness, and handling of edge cases.
- If the answer is very short (under 10 words) or completely off-topic (and no valid code is provided), accuracy and depth MUST be below 3.
- Do NOT give communication/confidence scores above 5 if the answer was empty or irrelevant.
- Be honest and strict — this helps the student improve.

Score each dimension 1.0-10.0 (be strict and honest):
Return ONLY valid JSON (no backticks):
{
  "accuracy": 7.5,
  "communication": 7.0,
  "confidence": 6.5,
  "depth": 7.0,
  "examples": 6.0,
  "overall": 7.0,
  "verdict": "Hire",
  "strengths": ["Mentioned REST vs GraphQL correctly"],
  "improvements": ["Should have discussed caching strategies"],
  "detailedFeedback": "2-3 sentence honest analysis of what was good and what needs improvement.",
  "idealAnswer": "The ideal answer is: [3-5 sentence model answer]"
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text);
    if (!parsed.idealAnswer) parsed.idealAnswer = idealAnswer || null;
    return parsed;
  } catch (err) {
    console.error('[AI Engine] Evaluation error:', err?.message || err);
    return generateFallbackEvaluation({ questionText, idealAnswer, answer: trimmedAnswer, code: trimmedCode, metrics, expectedKeywords });
  }
}

function generateFallbackEvaluation({ questionText, idealAnswer, answer = '', code = '', metrics = {}, expectedKeywords = [] }) {
  const combined = (answer + ' ' + code).trim();
  const words = combined.split(/\s+/).filter(Boolean).length;
  const keywords = Array.isArray(expectedKeywords) ? expectedKeywords : [];

  // If too short → very low scores
  if (words < 5) {
    return {
      accuracy: 1.0, communication: 1.0, confidence: 1.5, depth: 1.0, examples: 1.0,
      overall: 1.1,
      verdict: 'Needs Practice',
      strengths: [],
      improvements: [
        'Your answer was too brief to be evaluated meaningfully.',
        'Try to provide at least 2-3 sentences explaining your thinking.',
        idealAnswer ? `Model answer: ${idealAnswer}` : 'Study the core concepts for this topic.'
      ],
      detailedFeedback: `Your answer was very short (${words} word${words !== 1 ? 's' : ''}). In a real interview, aim for 3-5 sentences that cover the key concepts, real-world examples, and tradeoffs.`,
      idealAnswer: idealAnswer || null
    };
  }

  let keywordHits = 0;
  keywords.forEach(kw => {
    if (combined.toLowerCase().includes(kw.toLowerCase())) keywordHits++;
  });

  const keyRatio = keywordHits / Math.max(1, keywords.length);
  const fillerPenalty = Math.min(1.5, (metrics.fillerCount || 0) * 0.3);
  const lengthBonus = Math.min(1.5, words / 60);

  const accuracy = Math.min(9.0, Math.max(2.0, keyRatio * 5.0 + 3.0));
  const comm = Math.min(9.0, Math.max(3.0, 6.5 + lengthBonus - fillerPenalty));
  const conf = Math.min(9.0, Math.max(3.5, 7.0 - fillerPenalty));
  const depth = Math.min(9.0, Math.max(2.0, accuracy * 0.8 + (code ? 1.0 : 0)));
  const examples = Math.min(9.0, Math.max(2.0, keywordHits > 1 ? 7.0 : 4.0));
  const overall = Number(((accuracy * 0.35) + (comm * 0.2) + (conf * 0.15) + (depth * 0.2) + (examples * 0.1)).toFixed(1));

  let verdict = 'Hire';
  if (overall >= 8.5) verdict = 'Strong Hire';
  else if (overall < 7.0) verdict = 'Needs Practice';
  else if (overall < 7.5) verdict = 'Weak Hire';

  const strengths = [];
  if (keywordHits > 0) strengths.push(`Mentioned ${keywordHits} of ${keywords.length} core concept(s): ${keywords.slice(0, keywordHits).join(', ')}.`);
  if (words > 50) strengths.push('Provided a detailed response with good length.');
  if ((metrics.fillerCount || 0) <= 2) strengths.push('Fluent delivery with minimal filler words.');
  if (strengths.length === 0) strengths.push('Attempted to address the question — keep building on this.');

  const improvements = [];
  if (keywords.length > 0 && keywordHits < keywords.length) {
    const missing = keywords.filter(k => !combined.toLowerCase().includes(k.toLowerCase())).slice(0, 3);
    if (missing.length) improvements.push(`Key concepts not mentioned: ${missing.join(', ')}. Study these specifically.`);
  }
  if (words < 30) improvements.push('Expand your answer with concrete examples and real-world context.');
  if ((metrics.fillerCount || 0) > 3) improvements.push(`Reduce filler words (${metrics.fillerCount} detected) — practice speaking more deliberately.`);
  if (improvements.length === 0) improvements.push('Practice explaining edge cases and failure scenarios for a stronger answer.');

  const idealRef = idealAnswer ? `\n\nModel Answer: ${idealAnswer}` : '';

  return {
    accuracy: +accuracy.toFixed(1), communication: +comm.toFixed(1),
    confidence: +conf.toFixed(1), depth: +depth.toFixed(1), examples: +examples.toFixed(1),
    overall, verdict, strengths, improvements,
    detailedFeedback: `Your answer scored ${overall}/10 overall. ${strengths[0] || ''} ${improvements[0] || ''}${idealRef}`,
    idealAnswer: idealAnswer || null
  };
}

export async function evaluateCode({ problemTitle, problemDescription, language, code, testResult, inputFormat, outputFormat, constraints, examples }) {
  let finalVerdict = 'EVALUATION UNAVAILABLE';
  let passedCount = 0;
  let totalCount = 0;
  
  if (testResult && typeof testResult === 'object') {
     passedCount = testResult.passedCount || 0;
     totalCount = testResult.totalCount || 0;
     
     if (testResult.status === 'compilation_error') finalVerdict = 'COMPILATION ERROR';
     else if (testResult.status === 'runtime_error') finalVerdict = 'RUNTIME ERROR';
     else if (testResult.status === 'time_limit_exceeded') finalVerdict = 'TIME LIMIT EXCEEDED';
     else if (testResult.status === 'wrong_answer') finalVerdict = 'INCORRECT ANSWER';
     else if (testResult.status === 'success') finalVerdict = 'CORRECT ANSWER';
     else if (testResult.status === 'error') finalVerdict = 'EVALUATION UNAVAILABLE';
  }
  
  const correctness = totalCount > 0 ? Number(((passedCount / totalCount) * 100).toFixed(2)) + '%' : '0%';
  const failedCount = Math.max(0, totalCount - passedCount);

  let mappedVerdict = 'error';
  if (finalVerdict === 'CORRECT ANSWER') mappedVerdict = 'correct';
  else if (finalVerdict === 'INCORRECT ANSWER' || finalVerdict === 'RUNTIME ERROR' || finalVerdict === 'COMPILATION ERROR' || finalVerdict === 'TIME LIMIT EXCEEDED') mappedVerdict = 'incorrect';

  let failedTestCaseInfo = '';
  if (testResult && testResult.results) {
    const failedTest = testResult.results.find(r => !r.passed && r.expectedOutput !== 'Hidden');
    if (failedTest) {
      failedTestCaseInfo = `\nFailed Test Case:\nInput: ${failedTest.input || 'Unavailable'}\nExpected Output: ${failedTest.expectedOutput || 'Unavailable'}\nActual Output: ${failedTest.actualOutput || 'Unavailable'}`;
    }
  }

  const fallback = {
    verdict: mappedVerdict,
    summary: finalVerdict,
    correctness,
    passedCount,
    failedCount,
    timeComplexity: "Unknown",
    spaceComplexity: "Unknown",
    logicAnalysis: mappedVerdict === 'correct' ? "Code executes successfully and passes all test cases." : "AI REVIEW TEMPORARILY UNAVAILABLE",
    codeQuality: "Unknown",
    edgeCaseAnalysis: "Unknown",
    userApproach: "Unknown",
    expectedApproach: "Unknown",
    difference: "Unknown",
    mistakeLocation: "Unknown",
    mistakeExplanation: "Unknown",
    improvementSuggestions: "Please try again later.",
    correctedCode: null,
    learningTopics: "Unknown",
    reviewStatus: "error",
    errorMessage: "AI review service is temporarily unavailable."
  };

  if (!genAI || finalVerdict === 'EVALUATION UNAVAILABLE') {
    return runFallbackEvaluation(code, testResult, mappedVerdict, failedTestCaseInfo, problemTitle, language, fallback);
  }

  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastErrorMsg = '';
  let modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  while (attempt < MAX_RETRIES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `You are an expert Senior Software Engineer conducting a code review.
Evaluate the submitted solution. DO NOT output verdict or correctness; focus on complexity and logic.

Problem: "${problemTitle}"
Description: "${problemDescription}"
Input Format: "${inputFormat || 'N/A'}"
Output Format: "${outputFormat || 'N/A'}"

Candidate Code:
\`\`\`${language}
${code}
\`\`\`

Execution Results:
Verdict: ${finalVerdict}
Passed: ${passedCount}/${totalCount}${failedTestCaseInfo}
${testResult?.compileError ? `\nCompilation Error:\n${testResult.compileError}` : ''}
${testResult?.runtimeError ? `\nRuntime Error:\n${testResult.runtimeError}` : ''}

Generate a concise, constructive code review in valid JSON format ONLY. Ensure your JSON strictly matches the following structure:
{
  "timeComplexity": "O(n) / Unknown (analyze from submitted code. If incorrect, provide complexity of the corrected approach)",
  "spaceComplexity": "O(n) / Unknown (analyze from submitted code. If incorrect, provide complexity of the corrected approach)",
  "logicAnalysis": "Analysis of the candidate's core logic. Why it works or why it fails.",
  "userApproach": "What strategy did the candidate attempt?",
  "expectedApproach": "What is the optimal algorithmic approach?",
  "difference": "What is the difference between their approach and the optimal one?",
  "mistakeLocation": "Exactly where the mistake is in the code (if incorrect, compile error, or runtime error). Extract specific line numbers if possible. If correct, output 'None'.",
  "mistakeExplanation": "Why the mistake causes a failure (if incorrect), explain the compile/runtime error. Include step-by-step reasoning. If correct, output 'N/A'. Use beginner-friendly language.",
  "improvementSuggestions": "Specific actionable steps to fix the issue. A step-by-step correction strategy. (if correct, 'Consider reviewing edge cases or optimizing time/space complexity.')",
  "correctedCode": "If incorrect, compile error, or runtime error, provide a clean, fully working CORRECT solution in the same language. Explain changes in comments. If correct, you may output an optimized version or output null if no optimization is needed. (string or null)",
  "codeQuality": "Feedback on code readability and structure.",
  "edgeCaseAnalysis": "How does it handle edge cases? Did it miss any?",
  "learningTopics": "Relevant DSA concepts or suggested next learning topics."
}`;

      // Set timeout for request
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      let text = result.response.text();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(text);
      
      let verifiedCorrectedCode = parsed.correctedCode || null;
      let reviewSource = "ai";
      
      // If we have a reference solution, use it
      if (REFERENCE_SOLUTIONS[problemTitle] && REFERENCE_SOLUTIONS[problemTitle][language]) {
         verifiedCorrectedCode = REFERENCE_SOLUTIONS[problemTitle][language];
      } else if (verifiedCorrectedCode) {
         // Validate the AI-generated solution
         try {
           const probRes = await db.query('SELECT id, wrapper_metadata FROM coding_problems WHERE title = $1', [problemTitle]);
           if (probRes.rows.length > 0) {
             const probId = probRes.rows[0].id;
             const wrapperMetadata = probRes.rows[0].wrapper_metadata;
             const tcRes = await db.query('SELECT * FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', [probId]);
             const testCases = tcRes.rows.map(tc => ({
               input: tc.input,
               expectedOutput: tc.expected_output,
               isHidden: tc.is_hidden
             }));
             const execRes = await simulateCodeExecution({ language, code: verifiedCorrectedCode, testCases, problemTitle, wrapperMetadata });
             if (execRes.status === 'success') {
               verifiedCorrectedCode = `// AI-Generated & Verified Solution\n${parsed.correctedCode}`;
             } else {
               verifiedCorrectedCode = `// Unverified Suggested Approach (Fails validation)\n${parsed.correctedCode}`;
             }
           }
         } catch (e) {
           console.error("[AI Engine] Failed to validate corrected code:", e);
           verifiedCorrectedCode = `// Unverified Suggested Approach (Validation unavailable)\n${parsed.correctedCode}`;
         }
      }

      return {
        verdict: mappedVerdict,
        summary: finalVerdict,
        correctness,
        passedCount,
        failedCount,
        timeComplexity: parsed.timeComplexity || 'Unknown',
        spaceComplexity: parsed.spaceComplexity || 'Unknown',
        logicAnalysis: parsed.logicAnalysis || 'Unknown',
        codeQuality: parsed.codeQuality || 'Unknown',
        edgeCaseAnalysis: parsed.edgeCaseAnalysis || 'Unknown',
        userApproach: parsed.userApproach || 'Unknown',
        expectedApproach: parsed.expectedApproach || 'Unknown',
        difference: parsed.difference || 'Unknown',
        mistakeLocation: parsed.mistakeLocation || 'Unknown',
        mistakeExplanation: parsed.mistakeExplanation || 'Unknown',
        improvementSuggestions: parsed.improvementSuggestions || 'Unknown',
        correctedCode: verifiedCorrectedCode,
        learningTopics: parsed.learningTopics || 'Unknown',
        reviewStatus: "success",
        errorMessage: null,
        reviewSource: "ai"
      };
    } catch (err) {
      const errMsg = err?.message || String(err);
      lastErrorMsg = errMsg;
      console.error(`[AI Engine] Code Evaluation error (attempt ${attempt + 1}):`, errMsg);

      if (errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('timeout') || errMsg.includes('high demand')) {
        attempt++;
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(res => setTimeout(res, delay));
          continue; // Retry
        }
      } else {
        // Break out of loop immediately for 400, 401, 403, 404, 429, or unrecoverable error
        break;
      }
    }
  }

  // Fallback Logic
  let errorCategory = 'AI review service is temporarily unavailable.';
  let httpStatus = 'Unknown';

  if (lastErrorMsg.includes('400')) { errorCategory = 'AI Request/Configuration Issue (400).'; httpStatus = '400'; }
  else if (lastErrorMsg.includes('401') || lastErrorMsg.includes('403')) { errorCategory = 'AI Authentication/Permission Issue.'; httpStatus = lastErrorMsg.includes('401') ? '401' : '403'; }
  else if (lastErrorMsg.includes('404')) { errorCategory = 'AI Model/Endpoint Issue (404).'; httpStatus = '404'; }
  else if (lastErrorMsg.includes('429') || lastErrorMsg.includes('Quota')) { errorCategory = 'AI Rate Limit Exceeded (429).'; httpStatus = '429'; }
  else if (lastErrorMsg.includes('500') || lastErrorMsg.includes('503') || lastErrorMsg.includes('high demand')) { errorCategory = 'AI Provider Availability Issue (503).'; httpStatus = lastErrorMsg.includes('500') ? '500' : '503'; }
  else if (lastErrorMsg.includes('fetch') || lastErrorMsg.includes('network') || lastErrorMsg.includes('timeout')) { errorCategory = 'AI Network Connection Failure.'; httpStatus = 'Network Error'; }

  return runFallbackEvaluation(code, testResult, mappedVerdict, failedTestCaseInfo, problemTitle, language, fallback, errorCategory);
}

function runFallbackEvaluation(code, testResult, mappedVerdict, failedTestCaseInfo, problemTitle, language, fallback, errorCategory = "AI review service is temporarily unavailable.") {
  let fallbackMistakeExplanation = 'Unknown';
  let fallbackMistakeLocation = 'Unknown';
  let fallbackLogicAnalysis = "Rule-based analysis applied because AI review is temporarily unavailable.";
  let fallbackImprovementSuggestions = 'Please try again later or review standard algorithmic approaches.';
  
  const codeTrimmed = code.trim();
  if (codeTrimmed === 'pass' || codeTrimmed === 'return' || codeTrimmed === '' || codeTrimmed.includes('pass\n')) {
    fallbackLogicAnalysis = "The implementation is an incomplete stub or placeholder.";
    fallbackMistakeExplanation = "No functional algorithm has been implemented yet. The function does not process the input.";
    fallbackImprovementSuggestions = "The optimal approach for this problem typically involves implementing standard algorithmic patterns. Try writing the core logic rather than leaving the placeholder.";
  } else if (testResult && testResult.compileError) {
    fallbackLogicAnalysis = "Syntax/Compilation Error Detected.";
    fallbackMistakeExplanation = "The compiler encountered an error:\n" + testResult.compileError;
    const lineMatch = testResult.compileError.match(/line (\d+)/i);
    if (lineMatch) fallbackMistakeLocation = "Line " + lineMatch[1];
    fallbackImprovementSuggestions = 'Review the compiler output and fix any syntax or structural errors in your code.';
    if (testResult.compileError.includes('IndentationError')) {
      fallbackMistakeExplanation = 'Python requires consistent indentation. Ensure all blocks are properly aligned.';
      fallbackImprovementSuggestions = 'Fix the indentation levels in your code (use exactly 4 spaces per level).';
    } else if (testResult.compileError.includes('SyntaxError')) {
      fallbackMistakeExplanation = 'There is a syntax error in the code (e.g., missing colon, unmatched parenthesis).';
    }
  } else if (testResult && testResult.runtimeError) {
    fallbackLogicAnalysis = "Runtime Exception Detected.";
    fallbackMistakeExplanation = "A runtime error occurred during execution:\n" + testResult.runtimeError;
    const lineMatch = testResult.runtimeError.match(/line (\d+)/i);
    if (lineMatch) fallbackMistakeLocation = "Line " + lineMatch[1];
    fallbackImprovementSuggestions = 'Check for common runtime issues like dividing by zero, null references, or out-of-bounds array access.';
    if (testResult.runtimeError.includes('IndentationError') || testResult.runtimeError.includes('SyntaxError')) {
      fallbackLogicAnalysis = "Syntax/Indentation Error Detected.";
      fallbackMistakeExplanation = "Python rejected the code syntax:\n" + testResult.runtimeError;
      fallbackImprovementSuggestions = 'Python requires strict and consistent indentation. Ensure all blocks are properly aligned using 4 spaces, and check for missing colons.';
    } else if (testResult.runtimeError.includes('ZeroDivisionError')) {
      fallbackImprovementSuggestions = 'Ensure that the denominator is not zero before performing division.';
    } else if (testResult.runtimeError.includes('IndexError')) {
      fallbackImprovementSuggestions = 'Ensure you are not accessing indices outside the bounds of the array/list.';
    }
  } else if (mappedVerdict === 'incorrect') {
    fallbackLogicAnalysis = "Logic Error Detected.";
    if (failedTestCaseInfo) {
      fallbackMistakeExplanation = "Your code output does not match the expected output for the given test case.\n" + failedTestCaseInfo;
    } else {
      fallbackMistakeExplanation = 'The algorithm failed to produce the correct results for one or more test cases.';
    }
    fallbackImprovementSuggestions = `The logic failed for the problem "${problemTitle}". Carefully trace your code with the provided public test cases to understand where the logical flaw is.`;
  } else if (mappedVerdict === 'correct') {
    fallbackLogicAnalysis = "Code executes successfully and passes all test cases.";
    fallbackMistakeExplanation = "N/A";
    fallbackMistakeLocation = "None";
    fallbackImprovementSuggestions = "Consider reviewing edge cases or optimizing time/space complexity.";
  }

  let fallbackCorrectedCode = null;
  if (REFERENCE_SOLUTIONS[problemTitle] && REFERENCE_SOLUTIONS[problemTitle][language]) {
    fallbackCorrectedCode = `// AI-Generated & Verified Solution\n${REFERENCE_SOLUTIONS[problemTitle][language]}`;
    if (mappedVerdict !== 'correct') {
      fallbackImprovementSuggestions += `\n\nReview the trusted reference solution provided below to see the optimal approach and data structures for "${problemTitle}".`;
    }
  } else if (mappedVerdict !== 'correct') {
    fallbackCorrectedCode = "// A trusted reference solution is currently unavailable for this problem and language.";
  }

  return {
    ...fallback,
    logicAnalysis: fallbackLogicAnalysis,
    mistakeLocation: fallbackMistakeLocation,
    mistakeExplanation: fallbackMistakeExplanation,
    improvementSuggestions: fallbackImprovementSuggestions,
    correctedCode: fallbackCorrectedCode !== null ? fallbackCorrectedCode : fallback.correctedCode,
    errorMessage: errorCategory,
    reviewStatus: "error",
    reviewSource: "rule_based_fallback"
  };
}

export const PISTON_LANG_MAP = {
  'Python': { language: 'python', version: '3.10.0', filename: 'main.py' },
  'Java': { language: 'java', version: '15.0.2', filename: 'Main.java' },
  'C++': { language: 'c++', version: '10.2.0', filename: 'main.cpp' },
  'JavaScript': { language: 'javascript', version: '18.15.0', filename: 'main.js' }
};

export function compareOutputs(actual, expected, problemTitle = '') {
  if (actual === null && expected === null) return true;
  if (actual === null || actual === undefined) return false;
  if (expected === null || expected === undefined) return false;

  const isOrderAgnostic = problemTitle.toLowerCase().includes('two sum');
  
  let parsedActual = actual;
  if (typeof actual === 'string') {
    try { parsedActual = JSON.parse(actual.replace(/'/g, '"')); } 
    catch(e) { parsedActual = actual.trim(); }
  }
  let parsedExpected = expected;
  if (typeof expected === 'string') {
    try { parsedExpected = JSON.parse(expected.replace(/'/g, '"')); } 
    catch(e) { parsedExpected = expected.trim(); }
  }

  if (isOrderAgnostic && Array.isArray(parsedActual) && Array.isArray(parsedExpected)) {
    return parsedActual.sort().join(',') === parsedExpected.sort().join(',');
  }
  return JSON.stringify(parsedActual) === JSON.stringify(parsedExpected);
}

export async function simulateCodeExecution({ language, code, testCases, problemTitle, wrapperMetadata }) {
  if (!PISTON_LANG_MAP[language]) {
    return { status: 'error', compileError: "Language " + language + " not supported" };
  }
  
  const langConfig = PISTON_LANG_MAP[language];
  let finalCode = code;
  try {
    finalCode = generateWrapperCode(language, code, testCases, problemTitle, wrapperMetadata);
  } catch(e) {
    return { status: 'error', compileError: 'Failed to generate wrapper code.' };
  }

  const payload = {
    language: langConfig.language,
    version: langConfig.version,
    files: [{ name: langConfig.filename, content: finalCode }]
  };

  let res;
  try {
    // using global fetch for node > 18
    res = await fetch(process.env.PISTON_URL || 'http://localhost:2000/api/v2/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    return { status: 'error', compileError: 'Failed to connect to execution engine.' };
  }
  
  const data = await res.json();
  const runOutput = data.run ? data.run.stdout : '';
  const runStderr = data.run ? data.run.stderr : '';
  const compileError = data.compile ? data.compile.stderr : '';
  
  if (data.compile && data.compile.code !== 0) {
    return { status: 'compilation_error', compileError: compileError || runOutput, passedCount: 0, totalCount: testCases.length, results: [] };
  }
  if (data.run && data.run.code !== 0 && !runOutput.includes('actualOutput')) {
    const isCompileErr = runStderr.includes('error: compilation failed') || runStderr.includes('error: not a statement');
    if (isCompileErr) {
      return { status: 'compilation_error', compileError: runStderr || runOutput, passedCount: 0, totalCount: testCases.length, results: [] };
    }
    return { status: 'runtime_error', runtimeError: runStderr || runOutput, passedCount: 0, totalCount: testCases.length, results: [] };
  }

  const results = [];
  let passedCount = 0;
  
  let parsedRunOutput = [];
  try {
      const match = runOutput.match(/\[.*\]/s);
      if (match) parsedRunOutput = JSON.parse(match[0]);
  } catch(e) {
      console.log("JSON Parse Error:", e);
  }
  
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const outItem = parsedRunOutput.find(r => r.testCaseIndex === i) || {};
    let actualOutput = outItem.actualOutput;
    let isRuntimeError = false;
    
    if (typeof actualOutput === 'string' && actualOutput.startsWith('RUNTIME_ERROR')) {
        isRuntimeError = true;
    }
    
    const passed = !isRuntimeError && compareOutputs(actualOutput, tc.expectedOutput, problemTitle);
    console.log(`[Test ${i}] actual: ${actualOutput}, expected: ${tc.expectedOutput}, passed: ${passed}, runOutput: ${runOutput}`);
    if (passed) passedCount++;
    
    results.push({
      testCaseIndex: i,
      passed,
      isRuntimeError,
      actualOutput: isRuntimeError ? actualOutput : (actualOutput !== undefined ? actualOutput : null),
      expectedOutput: tc.expectedOutput,
      input: tc.input
    });
  }
  
  let status = passedCount === testCases.length ? 'success' : 'wrong_answer';
  if (parsedRunOutput.length === 0 && runStderr) status = 'runtime_error'; // completely crashed
  return { status, passedCount, totalCount: testCases.length, results, runtimeError: runStderr };
}

export async function generateAptitudeQuestion({ category, difficulty, pastQA = [] }) {
  if (!genAI) {
    throw new Error('Gemini API is not configured.');
  }

  const askedQuestionsText = pastQA.map(q => {
    if (typeof q === 'string') return q.toLowerCase().trim();
    return (q.question_text || q.question || '').toLowerCase().trim();
  });

  const historyText = askedQuestionsText.slice(-10).join('\n');

  let attempts = 0;
  let failedAttempts = [];
  const MAX_ATTEMPTS = 5;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      const model = genAI.getGenerativeModel({ model: modelName, temperature: 0.7 + (attempts * 0.1) });
const warningStr = failedAttempts.length > 0 ? 'WARNING: You previously generated these questions which were REJECTED as duplicates. DO NOT generate these again:\\n' + failedAttempts.join('\\n') + '\\n\\n' : '';

      const prompt = `You are the aptitude question generator for JobDM.
Generate exactly ONE high-quality multiple-choice aptitude question.

Category:
${category}

Difficulty:
${difficulty}

You must strictly generate a question belonging to this category:
- If Category is "Quantitative Aptitude", strictly generate a mathematical aptitude question.
- If Category is "Verbal Ability", strictly generate a verbal/grammar/vocabulary/comprehension question.
- If Category is "Basic Coding", strictly generate a programming fundamentals question.
- If Category is "Data Structures & Algorithms", strictly generate a data structures/algorithms question.
- If Category is "Operating Systems", strictly generate an OS question.
- If Category is "Computer Networks", strictly generate a networking question.
- If Category is "DBMS", strictly generate a database/SQL/normalization/transaction question.
- If Category is "DCN", strictly generate a data communication/networking question.
- If Category is "Theory of Computation (TOC)", strictly generate a theory of computation question.
- If Category is "OOPS", strictly generate an object-oriented programming question.
- If Category is "C++", strictly generate a C++ language/programming question.
- If Category is "Logical Reasoning", strictly generate a logic/puzzle question.
Do NOT switch categories.

The question must:
- match the requested difficulty
- have exactly 4 options
- have exactly ONE correct answer (index 0, 1, 2, or 3)
- have a clear unambiguous solution
- include a concise explanation
- be suitable for placement/interview aptitude preparation
- NOT repeat or paraphrase any previously served question
- NOT be a trivial numerical variation of a previous question
- use a genuinely different concept/template when possible

Previously served questions/concepts:
${historyText.length > 0 ? historyText : 'None'}

${warningStr}
Generate a NEW question that is meaningfully different from all previous questions.

Return ONLY valid JSON:
{
  "question": "...",
  "options": [
    "...",
    "...",
    "...",
    "..."
  ],
  "correctAnswer": 0,
  "explanation": "...",
  "concept": "...",
  "difficulty": "Easy|Medium|Hard",
  "category": "${category}"
}`;

      // Set timeout for request
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      let text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.question || !parsed.options || parsed.options.length !== 4 || typeof parsed.correctAnswer !== 'number') {
        throw new Error('Invalid schema returned from Gemini');
      }
      if (parsed.category !== category) {
        throw new Error('Gemini returned wrong category: ' + parsed.category);
      }

      // Duplicate verification
      let isDuplicate = false;
      for (const past of askedQuestionsText) {
        const sim = calculateSimilarity(parsed.question, past);
        if (sim > 0.45 || parsed.question.toLowerCase().includes(past.slice(0, 30)) || past.includes(parsed.question.toLowerCase().slice(0, 30))) {
          isDuplicate = true;
          console.warn(`[AI Engine] Duplicate aptitude question generated (similarity ${sim.toFixed(2)}). Retrying...`);
          failedAttempts.push(parsed.question);
          break;
        }
      }

      if (!isDuplicate) {
        return parsed;
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      console.warn(`[AI Engine] Error generating aptitude question (attempt ${attempts}):`, errMsg);

      if (errMsg.includes('400') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('404')) {
         throw new Error(`Server configuration error with AI provider: ${errMsg}`);
      }

      if (attempts < MAX_ATTEMPTS) {
         if (errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('429') || errMsg.includes('timeout') || errMsg.includes('fetch failed')) {
            const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s
            console.log(`[AI Engine] Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
         }
      }
    }
  }

  throw new Error('AI question generation is temporarily unavailable. Please try again.');
}

export async function generateCodingProblem({ topic, difficulty, pastQA = [] }) {
  if (!genAI) {
    throw new Error('Gemini API is not configured.');
  }

  const askedQuestionsText = pastQA.map(q => {
    if (typeof q === 'string') return q.toLowerCase().trim();
    return (q.title || q.description || '').toLowerCase().trim();
  });

  const historyText = askedQuestionsText.slice(-10).join('\n');

  let attempts = 0;
  let failedAttempts = [];
  const MAX_ATTEMPTS = 5;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      const model = genAI.getGenerativeModel({ model: modelName, temperature: 0.7 + (attempts * 0.1) });
const warningStr = failedAttempts.length > 0 ? 'WARNING: You previously generated these problems which were REJECTED as duplicates or malformed. DO NOT generate these again:\\n' + failedAttempts.join('\\n') + '\\n\\n' : '';

      const prompt = `You are the coding problem generator for JobDM.
Generate exactly ONE high-quality coding problem.

Topic:
${topic}

Difficulty:
${difficulty}

The problem must:
- strongly focus on the requested Topic
- match the requested Difficulty
- be a real-world scenario/case-based problem (e.g. e-commerce inventory, payment processing, notification systems, warehouse, banking) rather than a purely abstract textbook question.
- have 3-5 deterministic, fully executable test cases.
- test cases MUST be valid (the output must be exactly correct for the given input).
- not repeat or paraphrase any previously served question.
- not be a trivial re-wording or variable rename of a previous question.
- be suitable for a programming interview.
- use "verified_company", "company_pattern", or "original" for sourceType. Do NOT fabricate company names.
- The main function/method MUST be named exactly \`solve\` in all languages (e.g., \`def solve(...)\` in Python, \`class Solution { public <type> solve(...) }\` in Java/C++). This is required by the execution engine.

Previously served questions:
${historyText.length > 0 ? historyText : 'None'}

${warningStr}
Generate a NEW problem that is meaningfully different from all previous questions.

Return ONLY valid JSON:
{
  "title": "...",
  "description": "...",
  "topic": "${topic}",
  "difficulty": "Easy|Medium|Hard",
  "caseStudy": "...",
  "inputFormat": "...",
  "outputFormat": "...",
  "constraints": [
    "..."
  ],
  "examples": [
    {
      "input": "...",
      "output": "...",
      "explanation": "..."
    }
  ],
  "functionSignature": "...",
  "starterCode": {
    "python": "def solve(x):\\n    pass",
    "java": "class Solution {\\n    public int solve(int x) {\\n        return 0;\\n    }\\n}",
    "cpp": "class Solution {\\npublic:\\n    int solve(int x) {\\n        return 0;\\n    }\\n};",
    "javascript": "function solve(x) {\\n    return null;\\n}"
  },
  "testCases": [
    {
      "input": "...",
      "expectedOutput": "..."
    }
  ],
  "hints": [
    "...",
    "..."
  ],
  "sourceType": "verified_company|company_pattern|original",
  "company": null
}

IMPORTANT FOR STARTER CODE:
- The function name MUST be exactly \`solve\`.
- You MUST adjust the arguments in the starter code to exactly match the number of inputs specified in your \`inputFormat\` and \`testCases\`. For example, if there are two inputs, use \`def solve(arr, k):\` in Python. Do not just blindly copy the 1-argument example above.`;

      // Set timeout for request
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 45000));
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      let text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.title || !parsed.description || !parsed.testCases || parsed.testCases.length === 0) {
        throw new Error('Invalid schema returned from Gemini (missing title, description, or testCases)');
      }

      // Duplicate verification
      let isDuplicate = false;
      for (const past of askedQuestionsText) {
        const sim = calculateSimilarity(parsed.title + " " + parsed.description, past);
        if (sim > 0.45 || parsed.title.toLowerCase().includes(past.slice(0, 30)) || past.includes(parsed.title.toLowerCase().slice(0, 30))) {
          isDuplicate = true;
          console.warn(`[AI Engine] Duplicate coding problem generated (similarity ${sim.toFixed(2)}). Retrying...`);
          failedAttempts.push(parsed.title);
          break;
        }
      }

      if (!isDuplicate) {
        return parsed;
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      console.warn(`[AI Engine] Error generating coding problem (attempt ${attempts}):`, errMsg);

      if (errMsg.includes('400') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('404')) {
         throw new Error(`Server configuration error with AI provider: ${errMsg}`);
      }

      if (attempts < MAX_ATTEMPTS) {
         if (errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('429') || errMsg.includes('timeout') || errMsg.includes('fetch failed')) {
            const delay = Math.pow(2, attempts) * 1000;
            console.log(`[AI Engine] Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
         }
      }
    }
  }

  throw new Error('AI coding question generation is temporarily unavailable. Please try again.');
}
