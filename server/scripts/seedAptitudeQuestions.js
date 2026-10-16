import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.5-flash', generationConfig: { responseMimeType: 'application/json' } });

const CATEGORIES = [
  'Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability', 
  'Basic Coding', 'Data Structures & Algorithms', 'Operating Systems', 
  'Computer Networks', 'DBMS', 'DCN', 'Theory of Computation (TOC)', 
  'OOPS', 'C++'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TARGET_COUNT = 30;

async function generateBatch(category, difficulty, neededCount, existingQuestions) {
  const existingTexts = existingQuestions.map(q => q.question.substring(0, 100));
  
  const prompt = `
  You are an expert technical interviewer and computer science professor.
  Generate exactly ${neededCount} UNIQUE, distinct, and meaningful multiple-choice questions for the category: "${category}" at "${difficulty}" difficulty.
  
  CRITICAL RULES:
  1. No duplicate concepts. Do NOT generate simple wording variations of the same question.
  2. Exactly ONE correct answer.
  3. Provide 4 options (A, B, C, D) but output them as an array of 4 strings.
  4. The explanation MUST explain why the answer is correct and why others are wrong.
  5. The difficulty MUST be accurate. (Easy = basic, Medium = multi-step/deeper, Hard = complex/advanced).
  
  DO NOT DUPLICATE THESE EXISTING QUESTIONS:
  ${existingTexts.join('\n')}
  
  Return a JSON array of objects matching this schema:
  [
    {
      "topic": "Subtopic (e.g. TCP/IP, Pointers, Profit/Loss)",
      "question": "The actual question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "The exact string of the correct option",
      "explanation": "Detailed explanation..."
    }
  ]
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error(`[Error] Gemini generation failed for ${category} ${difficulty}:`, err.message);
    return [];
  }
}

async function seed() {
  console.log('--- STARTING APTITUDE SEED SCRIPT ---');
  let totalAdded = 0;
  
  for (const category of CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      while (true) {
        const existingRes = await db.query(
          'SELECT id, question FROM aptitude_questions WHERE category = $1 AND difficulty = $2',
          [category, difficulty]
        );
        
        const currentCount = existingRes.rows.length;
        const neededCount = TARGET_COUNT - currentCount;
        
        if (neededCount <= 0) {
          console.log(`[Skip] ${category} - ${difficulty}: Already has ${currentCount} questions.`);
          break; // move to next difficulty
        }
        
        // Ask for up to 30 at a time to speed it up (Gemini Flash can handle 8192 output tokens)
        const batchSize = Math.min(neededCount, 30);
        console.log(`[Gen] ${category} - ${difficulty}: Need ${neededCount} more questions. Generating batch of ${batchSize}...`);
        
        const newQuestions = await generateBatch(category, difficulty, batchSize, existingRes.rows);
        
        if (!newQuestions || newQuestions.length === 0) {
           console.log(`[Warn] ${category} - ${difficulty} failed or returned 0. Waiting 5s and trying again...`);
           await new Promise(r => setTimeout(r, 5000));
           continue; // try again
        }

        let addedThisBatch = 0;
        for (const q of newQuestions) {
          if (!q.question || !q.options || q.options.length < 2 || !q.correct_answer) continue;
          if (!q.options.includes(q.correct_answer)) continue;
          
          // Idempotent duplicate check based on exact string match just in case
          const dupCheck = await db.query(
            'SELECT id FROM aptitude_questions WHERE category = $1 AND question = $2',
            [category, q.question]
          );
          
          if (dupCheck.rows.length === 0) {
            try {
              await db.query(
                `INSERT INTO aptitude_questions 
                 (category, topic, difficulty, question, options, correct_answer, explanation)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [category, q.topic || 'General', difficulty, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation || '']
              );
              addedThisBatch++;
              totalAdded++;
            } catch(e) {
               console.error('Insert error:', e.message);
            }
          }
        }
        console.log(`[Success] Added ${addedThisBatch} questions to ${category} - ${difficulty}. Total in DB: ${currentCount + addedThisBatch}`);
        
        // Delay to avoid rate limit
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  
  console.log(`--- SEEDING COMPLETE. Total Added: ${totalAdded} ---`);
  
  const stats = await db.query('SELECT category, difficulty, count(*) as c FROM aptitude_questions GROUP BY category, difficulty ORDER BY category, difficulty');
  console.log('\\nFinal Counts:');
  stats.rows.forEach(r => console.log(`${r.category} | ${r.difficulty} | ${r.c}`));
  
  process.exit(0);
}

seed();
