import db from '../db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_MODEL || 'gemini-3.5-flash', 
  generationConfig: { responseMimeType: 'application/json' } 
});

const TARGET_PER_CATEGORY = 2000;
const CATEGORIES = [
  'Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability', 
  'Basic Coding', 'Data Structures & Algorithms', 'Operating Systems', 
  'Computer Networks', 'DBMS', 'DCN', 'Theory of Computation (TOC)', 
  'OOPS', 'C++'
];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// Simple Jaccard similarity for conceptual/textual deduplication check
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  let intersection = 0;
  for (let w of words1) if (words2.has(w)) intersection++;
  const union = words1.size + words2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchExistingQuestions(category) {
  const res = await db.query('SELECT question, difficulty FROM aptitude_questions WHERE category = $1', [category]);
  return res.rows;
}

async function generateBatch(category, difficulty, batchSize, existingQuestions) {
  const existingTexts = existingQuestions.map(q => q.question);
  
  const prompt = \`
  You are an expert curriculum designer building a production-scale aptitude question bank.
  Generate exactly \${batchSize} UNIQUE, highly diverse multiple-choice questions for the category: "\${category}" at "\${difficulty}" difficulty.
  
  CRITICAL RULES:
  1. DO NOT REPEAT ANY CONCEPT. The questions must be fundamentally different in reasoning, not just number changes.
  2. Exactly ONE correct answer. Provide 4 options (A, B, C, D) in the "options" array.
  3. The "explanation" MUST thoroughly explain the logic.
  4. Ensure difficulty is strictly maintained (Easy=basic, Medium=multi-step, Hard=advanced).
  5. Include metadata for REAL company assessment patterns if applicable.
     - If it perfectly matches a publicly known company pattern, set "sourceType": "company_pattern" and "company": "TCS" (or Infosys, Wipro, etc.).
     - Otherwise, set "sourceType": "original".
     - Do NOT fabricate company names.

  Return a JSON array of objects matching this exact schema:
  [
    {
      "topic": "Specific subtopic (e.g. Memory Management, Routing, Profit/Loss)",
      "question": "The question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Exact string of correct option",
      "explanation": "Detailed explanation...",
      "metadata": {
         "sourceType": "original | company_pattern | verified_company",
         "company": "TCS | Infosys | Wipro | None",
         "patternSource": "Optional public source info"
      }
    }
  ]
  \`;
  
  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    if (err.message.includes('429')) {
      console.error('[FATAL] API Quota Exceeded (429 Too Many Requests). Wait for quota reset.');
      process.exit(1);
    }
    console.error(\`[Error] Failed generating for \${category}-\${difficulty}: \${err.message}\`);
    return [];
  }
}

async function seed() {
  console.log('--- STARTING MASS PRODUCTION SEEDER (Target: 24,000 Questions) ---');
  let totalSessionAdded = 0;

  for (const category of CATEGORIES) {
    console.log(\`\n=== Processing Category: \${category} ===\`);
    
    for (const difficulty of DIFFICULTIES) {
      // Calculate target distribution
      let diffTarget = 700; 
      if (difficulty === 'Medium') diffTarget = 800;
      if (difficulty === 'Hard') diffTarget = 500;

      while (true) {
        const existing = await fetchExistingQuestions(category);
        const existingForDiff = existing.filter(q => q.difficulty === difficulty);
        
        const needed = diffTarget - existingForDiff.length;
        if (needed <= 0) {
          console.log(\`[✔] \${category} - \${difficulty} is FULL (\${existingForDiff.length} >= \${diffTarget})\`);
          break;
        }

        const batchSize = Math.min(needed, 10);
        console.log(\`[\u23F3] \${category} - \${difficulty}: Need \${needed}. Generating batch of \${batchSize}...\`);
        
        const newQuestions = await generateBatch(category, difficulty, batchSize, existing);
        if (newQuestions.length === 0) {
          console.log(\`[!] Batch generation failed. Retrying in 10s...\`);
          await sleep(10000);
          continue;
        }

        let addedThisBatch = 0;
        for (const q of newQuestions) {
          // 1. Validation
          if (!q.question || !q.options || q.options.length < 2 || !q.correct_answer || !q.explanation) continue;
          if (!q.options.includes(q.correct_answer)) continue;
          
          // 2. Advanced Duplicate Detection (Semantic + String)
          let isDuplicate = false;
          for (const ex of existing) {
            if (ex.question === q.question) { isDuplicate = true; break; }
            if (calculateSimilarity(ex.question, q.question) > 0.75) { isDuplicate = true; break; }
          }
          
          if (isDuplicate) continue;

          // 3. Database Insertion
          try {
            await db.query(
              \`INSERT INTO aptitude_questions 
               (category, topic, difficulty, question, options, correct_answer, explanation, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
              [
                category, q.topic || 'General', difficulty, q.question, 
                JSON.stringify(q.options), q.correct_answer, q.explanation, 
                q.metadata || { sourceType: 'original' }
              ]
            );
            addedThisBatch++;
            totalSessionAdded++;
            existing.push({ question: q.question, difficulty }); // Update local cache
          } catch(e) {
            console.error('[DB Error]', e.message);
          }
        }
        
        console.log(\`[+] Added \${addedThisBatch} new \${difficulty} questions. Total for category: \${existingForDiff.length + addedThisBatch}\`);
        await sleep(3000); // Wait 3s between API calls to respect rate limits
      }
    }
  }

  console.log(\`\n--- SEEDING COMPLETE. Added \${totalSessionAdded} questions this session. ---\`);
  const stats = await db.query('SELECT category, difficulty, count(*) as c FROM aptitude_questions GROUP BY category, difficulty ORDER BY category, difficulty');
  console.table(stats.rows);
  process.exit(0);
}

seed();
