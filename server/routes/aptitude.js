import express from 'express';
import db from '../db.js';
import { authenticateToken, authenticateOptional } from './auth.js';
import crypto from 'crypto';
import { generateAptitudeQuestion } from '../services/aiEngine.js';

const router = express.Router();

// GET /api/aptitude/categories (Progress included if authenticated)
router.get('/categories', authenticateOptional, async (req, res) => {
  try {
    const categories = [
      { id: 'logical-reasoning', name: 'Logical Reasoning', description: 'Test your logic and puzzle-solving skills.', icon: 'Brain' },
      { id: 'quantitative-aptitude', name: 'Quantitative Aptitude', description: 'Mathematical and numerical problem solving.', icon: 'Calculator' },
      { id: 'verbal-ability', name: 'Verbal Ability', description: 'Grammar, vocabulary, and comprehension.', icon: 'BookOpen' },
      { id: 'basic-coding', name: 'Basic Coding', description: 'Fundamentals of programming and logic.', icon: 'Code' },
      { id: 'data-structures', name: 'Data Structures & Algorithms', description: 'Core computer science concepts.', icon: 'Network' },
      { id: 'operating-systems', name: 'Operating Systems', description: 'Process management, memory, and OS concepts.', icon: 'Cpu' },
      { id: 'computer-networks', name: 'Computer Networks', description: 'OSI, TCP/IP, and networking protocols.', icon: 'Globe' },
      { id: 'dbms', name: 'DBMS', description: 'SQL, normalization, and database concepts.', icon: 'Database' },
      { id: 'dcn', name: 'DCN', description: 'Data Communication and Computer Networks.', icon: 'Wifi' },
      { id: 'toc', name: 'Theory of Computation (TOC)', description: 'Automata, grammars, and Turing machines.', icon: 'Binary' },
      { id: 'oops', name: 'OOPS', description: 'Object-oriented programming principles.', icon: 'Layers' },
      { id: 'cpp', name: 'C++', description: 'C++ programming language concepts.', icon: 'Terminal' }
    ];

    // Fetch counts from DB
    const countRes = await db.query('SELECT category, count(*) as count FROM aptitude_questions GROUP BY category');
    const counts = {};
    countRes.rows.forEach(r => counts[r.category] = parseInt(r.count));
    
    let progress = {};
    if (req.user) {
      const progRes = await db.query(`
        SELECT category, 
               COUNT(id) as sessions, 
               SUM(completed_questions) as attempted, 
               SUM(correct_answers) as correct, 
               MAX(score) as best_score
        FROM aptitude_sessions 
        WHERE user_id = $1 AND is_completed = true
        GROUP BY category
      `, [req.user.id]);
      
      progRes.rows.forEach(r => {
        progress[r.category] = {
          sessions: parseInt(r.sessions),
          attempted: parseInt(r.attempted),
          correct: parseInt(r.correct),
          accuracy: parseInt(r.attempted) > 0 ? Math.round((parseInt(r.correct) / parseInt(r.attempted)) * 100) : 0,
          bestScore: parseFloat(r.best_score)
        };
      });
    }

    const enhancedCategories = categories.map(c => ({
      ...c,
      questionCount: counts[c.name] || 0,
      progress: progress[c.name] || null
    }));

    res.json({ categories: enhancedCategories });
  } catch (error) {
    console.error('[aptitude/categories] Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

async function getOrGenerateQuestion(userId, category, difficulty) {
  let query = `
    SELECT id, category, topic, difficulty, question, options, starter_code, correct_answer, explanation 
    FROM aptitude_questions 
    WHERE category = $1
    AND id NOT IN (
      SELECT question_id FROM aptitude_attempts
      JOIN aptitude_sessions ON aptitude_attempts.session_id = aptitude_sessions.id
      WHERE aptitude_sessions.user_id = $2
    )
    AND id NOT IN (
      SELECT question_id FROM aptitude_generated_history WHERE user_id = $2
    )
  `;
  let params = [category, userId];
  if (difficulty && difficulty !== 'Mixed') {
    query += ' AND difficulty = $3';
    params.push(difficulty);
  }
  query += ' ORDER BY RANDOM() LIMIT 1';
  
  const result = await db.query(query, params);
  if (result.rows.length > 0) {
    const q = result.rows[0];
    const qHash = crypto.createHash('sha256').update(q.question.toLowerCase().trim()).digest('hex');
    await db.query(
      `INSERT INTO aptitude_generated_history (user_id, category, question_hash, question_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [userId, category, qHash, q.id]
    );
    return q;
  }
  
  const pastQARes = await db.query(`
    SELECT q.question 
    FROM aptitude_generated_history h
    JOIN aptitude_questions q ON h.question_id = q.id
    WHERE h.user_id = $1 AND h.category = $2
  `, [userId, category]);
  
  const pastQA = pastQARes.rows.map(r => r.question);
  
  const generated = await generateAptitudeQuestion({ category, difficulty: difficulty || 'Medium', pastQA });
  const qHash = crypto.createHash('sha256').update(generated.question.toLowerCase().trim()).digest('hex');
  
  let optionsJson = generated.options;
  if (typeof optionsJson !== 'string') optionsJson = JSON.stringify(optionsJson);

  let corrAns = generated.options[generated.correctAnswer] || generated.options[0];
  if (typeof corrAns === 'number' && generated.options[corrAns]) corrAns = generated.options[corrAns];
  
  const insertRes = await db.query(
    `INSERT INTO aptitude_questions (category, topic, difficulty, question, options, correct_answer, explanation)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [category, generated.concept || category, generated.difficulty || difficulty || 'Medium', generated.question, optionsJson, corrAns, generated.explanation]
  );
  const newQId = insertRes.rows[0].id;
  
  await db.query(
    `INSERT INTO aptitude_generated_history (user_id, category, question_hash, question_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [userId, category, qHash, newQId]
  );
  
  return {
    id: newQId, category, topic: generated.concept || category, difficulty: generated.difficulty || difficulty || 'Medium',
    question: generated.question, options: generated.options, starter_code: null
  };
}

// POST /api/aptitude/start - Start a new session and get questions
router.post('/start', authenticateToken, async (req, res) => {
  const { category, difficulty, count } = req.body;
  if (!category || !count) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    const q = await getOrGenerateQuestion(req.user.id, category, difficulty);
    
    // Create session
    const sessionRes = await db.query(
      `INSERT INTO aptitude_sessions (user_id, category, difficulty, total_questions) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, category, difficulty || 'Mixed', count]
    );
    
    res.json({ 
      sessionId: sessionRes.rows[0].id, 
      category, 
      difficulty,
      totalQuestions: count,
      questions: [q] 
    });
  } catch (error) {
    console.error('[aptitude/start] Error:', error.message);
    if (error.message.includes('AI question generation is temporarily unavailable')) {
        return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/aptitude/next - Get next question
router.post('/next', authenticateToken, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    const sessionRes = await db.query('SELECT * FROM aptitude_sessions WHERE id = $1 AND user_id = $2', [sessionId, req.user.id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    
    const sess = sessionRes.rows[0];
    const q = await getOrGenerateQuestion(req.user.id, sess.category, sess.difficulty);
    
    res.json({ question: q });
  } catch (error) {
    console.error('[aptitude/next] Error:', error.message);
    if (error.message.includes('AI question generation is temporarily unavailable')) {
        return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/aptitude/submit - Submit answers and end session
router.post('/submit', authenticateToken, async (req, res) => {
  const { sessionId, answers, durationMinutes } = req.body;
  if (!sessionId || !answers) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    // Verify session
    const sessionRes = await db.query('SELECT * FROM aptitude_sessions WHERE id = $1 AND user_id = $2', [sessionId, req.user.id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    if (sessionRes.rows[0].is_completed) return res.status(400).json({ error: 'Session already completed' });
    
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    
    // Process answers and get correct answers
    const results = [];
    for (const ans of answers) {
      if (!ans.questionId) continue;
      
      const qRes = await db.query('SELECT correct_answer, explanation FROM aptitude_questions WHERE id = $1', [ans.questionId]);
      if (qRes.rows.length === 0) continue;
      
      const q = qRes.rows[0];
      const isCorrect = ans.userAnswer === q.correct_answer;
      
      if (!ans.userAnswer) {
        skippedCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
      
      results.push({
        questionId: ans.questionId,
        userAnswer: ans.userAnswer,
        correctAnswer: q.correct_answer,
        isCorrect: ans.userAnswer ? isCorrect : null,
        explanation: q.explanation
      });
      
      // Save attempt
      await db.query(
        `INSERT INTO aptitude_attempts (session_id, question_id, user_answer, is_correct) VALUES ($1, $2, $3, $4)`,
        [sessionId, ans.questionId, ans.userAnswer, ans.userAnswer ? isCorrect : null]
      );
    }
    
    const totalQuestions = sessionRes.rows[0].total_questions;
    const completedQuestions = correctCount + incorrectCount;
    const score = completedQuestions > 0 ? (correctCount / completedQuestions) * 100 : 0;
    
    // Update session
    await db.query(
      `UPDATE aptitude_sessions SET 
        is_completed = true, completed_at = CURRENT_TIMESTAMP,
        completed_questions = $1, correct_answers = $2, incorrect_answers = $3, skipped_answers = $4,
        score = $5, duration_minutes = $6
       WHERE id = $7`,
      [completedQuestions, correctCount, incorrectCount, skippedCount, score, durationMinutes, sessionId]
    );
    
    res.json({
      score,
      correct: correctCount,
      incorrect: incorrectCount,
      skipped: skippedCount,
      answered: completedQuestions,
      total: totalQuestions,
      durationMinutes,
      results
    });
  } catch (error) {
    console.error('[aptitude/submit] Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/aptitude/progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const progRes = await db.query(`
      SELECT category, 
             COUNT(id) as sessions, 
             SUM(completed_questions) as attempted, 
             SUM(correct_answers) as correct, 
             MAX(score) as best_score
      FROM aptitude_sessions 
      WHERE user_id = $1 AND is_completed = true
      GROUP BY category
    `, [req.user.id]);
    
    const overallRes = await db.query(`
      SELECT COUNT(id) as total_sessions,
             SUM(completed_questions) as total_attempted,
             SUM(correct_answers) as total_correct
      FROM aptitude_sessions
      WHERE user_id = $1 AND is_completed = true
    `, [req.user.id]);
    
    res.json({
      categories: progRes.rows,
      overall: overallRes.rows[0]
    });
  } catch (error) {
    console.error('[aptitude/progress] Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
