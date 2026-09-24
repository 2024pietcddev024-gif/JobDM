import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { generateQuestion, evaluateAnswer } from '../services/aiEngine.js';

const router = express.Router();

function safeJson(val) {
  if (!val) return [];
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return val;
}

// POST /api/interviews/start
router.post('/start', authenticateToken, async (req, res) => {
  const { category, role, difficulty, mode, resumeData, totalQuestions = 10 } = req.body;
  if (!category || !difficulty) return res.status(400).json({ error: 'Category and difficulty are required' });

  try {
    const qData = await generateQuestion({ category, role, difficulty, resumeData, pastQA: [], questionIndex: 0 });

    let sessionId = null;
    let questionId = null;

    try {
      const sessionRes = await db.query(
        `INSERT INTO interview_sessions (user_id, category, role, difficulty, mode)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [req.user.id, category, role || null, difficulty, mode || 'voice']
      );
      sessionId = sessionRes.rows[0].id;

      const questionRes = await db.query(
        `INSERT INTO questions (session_id, question_text, question_type, topics, expected_keywords, coding_starter, ideal_answer)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [sessionId, qData.question, qData.type, JSON.stringify(qData.topics), JSON.stringify(qData.expectedKeywords), qData.codingPrompt, qData.idealAnswer || null]
      );
      questionId = questionRes.rows[0].id;
      console.log(`[interviews/start] DB session created: ${sessionId}`);
    } catch (dbErr) {
      console.warn('[interviews/start] DB error, using ephemeral session:', dbErr.message);
      sessionId = `ephemeral-${Date.now()}`;
      questionId = `ephemeral-q-${Date.now()}`;
    }

    const question = {
      id: questionId,
      session_id: sessionId,
      question_text: qData.question,
      question: qData.question,
      question_type: qData.type,
      type: qData.type,
      topics: qData.topics,
      expected_keywords: qData.expectedKeywords,
      expectedKeywords: qData.expectedKeywords,
      coding_starter: qData.codingPrompt,
      codingPrompt: qData.codingPrompt,
      idealAnswer: qData.idealAnswer || null
    };

    res.status(201).json({
      session: { id: sessionId, category, role, difficulty, mode: mode || 'voice', currentQuestionIndex: 0, totalQuestions },
      question
    });
  } catch (error) {
    console.error('[interviews/start] Error:', error);
    res.status(500).json({ error: 'Failed to start interview: ' + error.message });
  }
});

// POST /api/interviews/next-question — get next question during interview
router.post('/next-question', authenticateToken, async (req, res) => {
  const { sessionId, category, role, difficulty, questionIndex, askedQuestions = [] } = req.body;

  try {
    const qData = await generateQuestion({ category, role, difficulty, pastQA: askedQuestions, questionIndex });

    let questionId = `ephemeral-q-${Date.now()}`;

    if (sessionId && !String(sessionId).startsWith('ephemeral')) {
      try {
        const qRes = await db.query(
          `INSERT INTO questions (session_id, question_text, question_type, topics, expected_keywords, coding_starter, ideal_answer)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [sessionId, qData.question, qData.type, JSON.stringify(qData.topics), JSON.stringify(qData.expectedKeywords), qData.codingPrompt, qData.idealAnswer || null]
        );
        questionId = qRes.rows[0].id;
      } catch (dbErr) {
        console.warn('[interviews/next-question] DB error:', dbErr.message);
      }
    }

    res.json({
      question: {
        id: questionId,
        session_id: sessionId,
        question_text: qData.question,
        question: qData.question,
        question_type: qData.type,
        type: qData.type,
        topics: qData.topics,
        expected_keywords: qData.expectedKeywords,
        expectedKeywords: qData.expectedKeywords,
        coding_starter: qData.codingPrompt,
        codingPrompt: qData.codingPrompt,
        idealAnswer: qData.idealAnswer || null
      }
    });
  } catch (error) {
    console.error('[interviews/next-question] Error:', error);
    res.status(500).json({ error: 'Failed to generate question: ' + error.message });
  }
});

// POST /api/interviews/evaluate — evaluate one answer and save to DB
router.post('/evaluate', authenticateToken, async (req, res) => {
  const { sessionId, questionId, questionText, idealAnswer, expectedKeywords, answer, code, metrics, category } = req.body;

  try {
    const evalResult = await evaluateAnswer({
      questionText: questionText || 'General interview question',
      idealAnswer: idealAnswer || null,
      expectedKeywords: expectedKeywords || [],
      answer: answer || '',
      code: code || '',
      category: category || 'general',
      metrics: metrics || {}
    });

    // Save to DB if session is real (not ephemeral)
    if (sessionId && !String(sessionId).startsWith('ephemeral') && questionId && !String(questionId).startsWith('ephemeral')) {
      try {
        const ansRes = await db.query(
          `INSERT INTO answers (question_id, transcript, code_content, wpm, filler_words_count)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [questionId, answer || null, code || null, metrics?.wpm || null, metrics?.fillerCount || null]
        );
        const answerId = ansRes.rows[0].id;

        await db.query(
          `INSERT INTO scores (answer_id, accuracy_score, communication_score, confidence_score, depth_score, examples_score, overall_score, strengths, improvements, detailed_feedback)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [answerId, evalResult.accuracy, evalResult.communication, evalResult.confidence, evalResult.depth, evalResult.examples, evalResult.overall,
           JSON.stringify(evalResult.strengths), JSON.stringify(evalResult.improvements), evalResult.detailedFeedback]
        );
        console.log(`[interviews/evaluate] Saved answer+score for question ${questionId}`);
      } catch (dbErr) {
        console.warn('[interviews/evaluate] DB save error:', dbErr.message);
      }
    }

    res.json({ evaluation: evalResult });
  } catch (error) {
    console.error('[interviews/evaluate] Error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer: ' + error.message });
  }
});

// POST /api/interviews/complete — finalize interview session and compute overall score
router.post('/complete', authenticateToken, async (req, res) => {
  const { sessionId, questionsHistory, durationMinutes } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  // Compute overall score from all evaluations
  const validEvals = (questionsHistory || []).filter(qa => qa.evaluation?.overall != null);
  const overallScore = validEvals.length > 0
    ? (validEvals.reduce((sum, qa) => sum + parseFloat(qa.evaluation.overall), 0) / validEvals.length).toFixed(1)
    : null;

  if (!String(sessionId).startsWith('ephemeral')) {
    try {
      await db.query(
        `UPDATE interview_sessions SET
         overall_score = $1,
         duration_minutes = $2
         WHERE id = $3 AND user_id = $4`,
        [overallScore, durationMinutes || null, sessionId, req.user.id]
      );
      console.log(`[interviews/complete] Session ${sessionId} finalized. Score: ${overallScore}`);
    } catch (dbErr) {
      console.warn('[interviews/complete] DB update error:', dbErr.message);
    }
  }

  res.json({ success: true, overallScore });
});

// GET /api/interviews/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await db.query(
      `SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ sessions: history.rows });
  } catch (error) {
    console.error('[interviews/history] Error:', error.message);
    if (error.message.includes('not configured') || error.message.includes('ETIMEDOUT')) {
      return res.json({ sessions: [], warning: 'Database unavailable' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/interviews/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalRes = await db.query('SELECT count(*) FROM interview_sessions WHERE user_id = $1', [req.user.id]);
    const avgRes = await db.query('SELECT avg(overall_score) FROM interview_sessions WHERE user_id = $1 AND overall_score IS NOT NULL', [req.user.id]);
    res.json({
      totalInterviews: parseInt(totalRes.rows[0].count),
      avgScore: avgRes.rows[0].avg ? parseFloat(avgRes.rows[0].avg).toFixed(1) : null
    });
  } catch (error) {
    console.error('[interviews/stats] Error:', error.message);
    res.json({ totalInterviews: 0, avgScore: null, warning: 'Database unavailable' });
  }
});

// GET /api/interviews/report/:id
router.get('/report/:id', authenticateToken, async (req, res) => {
  const sessionId = req.params.id;
  try {
    const sessionRes = await db.query('SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2', [sessionId, req.user.id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const qaRes = await db.query(
      `SELECT q.id, q.question_text, q.topics, q.expected_keywords, q.ideal_answer,
              a.transcript, a.code_content, a.wpm, a.filler_words_count,
              s.accuracy_score, s.communication_score, s.confidence_score,
              s.depth_score, s.examples_score, s.overall_score,
              s.strengths, s.improvements, s.detailed_feedback
       FROM questions q
       LEFT JOIN answers a ON q.id = a.question_id
       LEFT JOIN scores s ON a.id = s.answer_id
       WHERE q.session_id = $1
       ORDER BY q.created_at ASC`,
      [sessionId]
    );

    res.json({ session: sessionRes.rows[0], qaPairs: qaRes.rows });
  } catch (error) {
    console.error('[interviews/report] Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
