import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { generateQuestion, evaluateAnswer, evaluateCode, analyzeResume } from '../services/aiEngine.js';
import { normalizeScore, getStudentInterviewMetrics, COMPLETED_STATUS_FILTER } from '../services/interviewMetrics.js';

const router = express.Router();

function safeJson(val) {
  if (!val) return [];
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return val;
}

// POST /api/interviews/analyze-resume
router.post('/analyze-resume', authenticateToken, async (req, res) => {
  const { fileData, mimeType, fileName } = req.body;
  if (!fileData) return res.status(400).json({ error: 'fileData is required' });

  try {
    const analysis = await analyzeResume(fileData, mimeType);
    
    res.json({ success: true, analysis, fileName });
  } catch (error) {
    console.error('[Diagnostic] [interviews/analyze-resume] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze resume' });
  }
});

// POST /api/interviews/start
router.post('/start', authenticateToken, async (req, res) => {
  const { category, role, difficulty, mode, resumeData, totalQuestions = 10, codingLanguage, interviewMode } = req.body;
  const hasResume = !!resumeData;
  if (!category && !hasResume) return res.status(400).json({ error: 'Please upload your resume or select at least one interview category to continue.' });
  if (!difficulty && !hasResume) return res.status(400).json({ error: 'Difficulty is required' });

  try {
    const qData = await generateQuestion({ category, role, difficulty, resumeData, codingLanguage, pastQA: [], questionIndex: 0, interviewMode });

    let sessionId = null;
    let questionId = null;

    try {
      const sessionRes = await db.query(
        `INSERT INTO interview_sessions (user_id, category, role, difficulty, mode, coding_language, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS') RETURNING id`,
        [req.user.id, category, role || null, difficulty, mode || 'voice', codingLanguage || null]
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
      session: { id: sessionId, category, role, difficulty, mode: mode || 'voice', codingLanguage: codingLanguage || null, currentQuestionIndex: 0, totalQuestions, resumeData, interviewMode },
      question
    });
  } catch (error) {
    console.error('[interviews/start] Error:', error);
    res.status(500).json({ error: 'Failed to start interview: ' + error.message });
  }
});

// POST /api/interviews/evaluate-code
// Using a separate route for AI code review (or we could put it in code.js)
router.post('/evaluate-code', authenticateToken, async (req, res) => {
  const { problemTitle, problemDescription, language, code, testResult, inputFormat, outputFormat, constraints, examples } = req.body;
  try {
    const review = await evaluateCode({ problemTitle, problemDescription, language, code, testResult, inputFormat, outputFormat, constraints, examples });
    res.json(review);
  } catch (error) {
    console.error('[API] /evaluate-code error:', error);
    res.status(500).json({ error: 'Failed to generate code review' });
  }
});

// POST /api/interviews/next-question — get next question during interview
router.post('/next-question', authenticateToken, async (req, res) => {
  const { sessionId, category, role, difficulty, questionIndex, codingLanguage, resumeData, interviewMode } = req.body;

  if (sessionId && !String(sessionId).startsWith('ephemeral')) {
    try {
      const sCheck = await db.query('SELECT status, termination_reason FROM interview_sessions WHERE id = $1 AND user_id = $2', [sessionId, req.user.id]);
      if (sCheck.rows.length > 0 && sCheck.rows[0].status === 'TERMINATED') {
        return res.status(403).json({
          error: 'Interview session has been terminated due to policy violation.',
          terminated: true,
          terminationReason: sCheck.rows[0].termination_reason
        });
      }
    } catch (e) {
      console.warn('[interviews/next-question] Termination check error:', e.message);
    }
  }

  let dbAskedQuestions = req.body.askedQuestions || [];
  if (sessionId && !String(sessionId).startsWith('ephemeral')) {
    try {
      const qRes = await db.query(
        `SELECT q.question_text, q.topics, a.transcript, a.code_content 
         FROM questions q 
         LEFT JOIN answers a ON q.id = a.question_id 
         WHERE q.session_id = $1 ORDER BY q.id ASC`,
        [sessionId]
      );
      if (qRes.rows.length > 0) {
        dbAskedQuestions = qRes.rows.map(row => {
          let parsedTopics = row.topics;
          if (typeof parsedTopics === 'string') {
            try { parsedTopics = JSON.parse(parsedTopics); } catch (e) { parsedTopics = []; }
          }
          return { 
            question_text: row.question_text, 
            topics: parsedTopics,
            answer: row.transcript || '',
            code: row.code_content || ''
          };
        });
      }
    } catch (dbErr) {
      console.warn('[interviews/next-question] DB fetch error:', dbErr.message);
    }
  }

  try {
    const qData = await generateQuestion({ category, role, difficulty, codingLanguage, pastQA: dbAskedQuestions, questionIndex, resumeData, interviewMode });

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

  // Server-side enforcement: Check if session has been terminated
  if (sessionId && !String(sessionId).startsWith('ephemeral')) {
    try {
      const sCheck = await db.query(
        'SELECT status, termination_reason FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, req.user.id]
      );
      if (sCheck.rows.length > 0 && sCheck.rows[0].status === 'TERMINATED') {
        return res.status(403).json({
          error: 'Interview session has been terminated due to policy violation. No further answers can be evaluated.',
          terminated: true,
          terminationReason: sCheck.rows[0].termination_reason
        });
      }
    } catch (e) {
      console.warn('[interviews/evaluate] Termination check error:', e.message);
    }
  }

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

  // Server-side enforcement: Check if session has been terminated
  if (!String(sessionId).startsWith('ephemeral')) {
    try {
      const sCheck = await db.query(
        'SELECT status, termination_reason FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, req.user.id]
      );
      if (sCheck.rows.length > 0 && sCheck.rows[0].status === 'TERMINATED') {
        return res.status(403).json({
          error: 'Session was terminated for policy violation and cannot be marked as completed.',
          terminated: true,
          terminationReason: sCheck.rows[0].termination_reason
        });
      }
    } catch (e) {
      console.warn('[interviews/complete] Termination check error:', e.message);
    }
  }

  // Compute overall score from all evaluations
  const validEvals = (questionsHistory || []).filter(qa => qa.evaluation?.overall != null);
  const rawScore = validEvals.length > 0
    ? (validEvals.reduce((sum, qa) => sum + parseFloat(qa.evaluation.overall), 0) / validEvals.length).toFixed(1)
    : null;
  const overallScore = normalizeScore(rawScore);

  if (!String(sessionId).startsWith('ephemeral')) {
    try {
      await db.query(
        `UPDATE interview_sessions SET
         overall_score = $1,
         duration_minutes = $2,
         status = 'COMPLETED',
         completed_at = NOW(),
         total_questions = $3,
         answered_questions = $4
         WHERE id = $5 AND user_id = $6`,
        [overallScore, durationMinutes || null, questionsHistory?.length || 0, validEvals.length, sessionId, req.user.id]
      );
      console.log(`[interviews/complete] Session ${sessionId} finalized as COMPLETED. Score: ${overallScore}%`);
    } catch (dbErr) {
      console.warn('[interviews/complete] DB update error:', dbErr.message);
    }
  }

  res.json({ success: true, overallScore });
});

// POST /api/interviews/violation — record anti-cheating policy violation
router.post('/violation', authenticateToken, async (req, res) => {
  const { sessionId, violationType, details } = req.body;
  if (!sessionId || !violationType) {
    return res.status(400).json({ error: 'sessionId and violationType are required' });
  }

  const vType = String(violationType).toUpperCase();
  if (vType !== 'TAB_SWITCH' && vType !== 'CLIPBOARD_ACTION') {
    return res.status(400).json({ error: 'Invalid violationType. Must be TAB_SWITCH or CLIPBOARD_ACTION' });
  }

  if (String(sessionId).startsWith('ephemeral')) {
    return res.json({ warning: true, terminated: false, violationType: vType, violationCount: 1, limit: 2 });
  }

  try {
    const sessionRes = await db.query(
      'SELECT id, user_id, status, tab_switch_count, clipboard_violation_count, termination_reason, terminated_at FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    // If already terminated, return terminated state idempotently without creating duplicate termination records
    if (session.status === 'TERMINATED') {
      const currentCount = vType === 'TAB_SWITCH' ? (session.tab_switch_count || 2) : (session.clipboard_violation_count || 2);
      return res.json({
        warning: false,
        terminated: true,
        alreadyTerminated: true,
        status: 'TERMINATED',
        violationType: vType,
        violationCount: currentCount,
        tab_switch_count: session.tab_switch_count || 0,
        tabSwitchCount: session.tab_switch_count || 0,
        clipboard_violation_count: session.clipboard_violation_count || 0,
        clipboardViolationCount: session.clipboard_violation_count || 0,
        limit: 2,
        termination_reason: session.termination_reason,
        terminationReason: session.termination_reason,
        terminatedAt: session.terminated_at,
        message: session.termination_reason || 'Session is already terminated.'
      });
    }

    // Do not count violations if session is already COMPLETED or ABANDONED
    if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
      return res.json({
        warning: false,
        terminated: false,
        status: session.status,
        message: `Session is ${session.status.toLowerCase()}. No violations recorded.`
      });
    }

    const countCol = vType === 'TAB_SWITCH' ? 'tab_switch_count' : 'clipboard_violation_count';
    const newCount = (session[countCol] || 0) + 1;

    // Log the event in session_violations
    await db.query(
      `INSERT INTO session_violations (session_id, session_type, student_id, violation_type, violation_count, details)
       VALUES ($1, 'INTERVIEW', $2, $3, $4, $5)`,
      [sessionId, req.user.id, vType, newCount, JSON.stringify(details || {})]
    );

    const tabCount = vType === 'TAB_SWITCH' ? newCount : (session.tab_switch_count || 0);
    const clipCount = vType === 'CLIPBOARD_ACTION' ? newCount : (session.clipboard_violation_count || 0);

    if (newCount >= 2) {
      const terminationReason = vType === 'TAB_SWITCH'
        ? 'Session terminated because the tab-switch violation limit was reached.'
        : 'Session terminated because the prohibited clipboard action limit was reached.';

      await db.query(
        `UPDATE interview_sessions
         SET ${countCol} = $1,
             status = 'TERMINATED',
             termination_reason = $2,
             terminated_at = NOW()
         WHERE id = $3 AND user_id = $4`,
        [newCount, terminationReason, sessionId, req.user.id]
      );

      return res.json({
        warning: false,
        terminated: true,
        status: 'TERMINATED',
        violationType: vType,
        violationCount: newCount,
        tab_switch_count: tabCount,
        tabSwitchCount: tabCount,
        clipboard_violation_count: clipCount,
        clipboardViolationCount: clipCount,
        limit: 2,
        termination_reason: terminationReason,
        terminationReason,
        terminatedAt: new Date().toISOString(),
        message: terminationReason
      });
    } else {
      await db.query(
        `UPDATE interview_sessions SET ${countCol} = $1 WHERE id = $2 AND user_id = $3`,
        [newCount, sessionId, req.user.id]
      );

      const warningMessage = vType === 'TAB_SWITCH'
        ? 'Warning 1 of 2: You left your active session. Switching tabs or leaving the session repeatedly may terminate your interview or coding practice.'
        : 'Warning 1 of 2: Copying, cutting, or pasting code is not allowed during this interview session. Repeated violations will end the session.';

      return res.json({
        warning: true,
        terminated: false,
        status: session.status || 'ACTIVE',
        violationType: vType,
        violationCount: newCount,
        tab_switch_count: tabCount,
        tabSwitchCount: tabCount,
        clipboard_violation_count: clipCount,
        clipboardViolationCount: clipCount,
        limit: 2,
        message: warningMessage
      });
    }
  } catch (error) {
    console.error('[interviews/violation] Error:', error);
    res.status(500).json({ error: 'Server error recording violation' });
  }
});

// GET /api/interviews/session/:sessionId/status — check active session status and violation counts
router.get('/session/:sessionId/status', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || String(sessionId).startsWith('ephemeral')) {
    return res.json({ status: 'IN_PROGRESS', tabSwitchCount: 0, clipboardViolationCount: 0 });
  }

  try {
    const sessionRes = await db.query(
      `SELECT id, status, tab_switch_count, clipboard_violation_count, termination_reason, terminated_at, overall_score
       FROM interview_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, req.user.id]
    );

    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const s = sessionRes.rows[0];

    const vRes = await db.query(
      `SELECT id, violation_type, violation_count, details, created_at 
       FROM session_violations 
       WHERE session_id = $1 AND session_type = 'INTERVIEW' 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      sessionId: s.id,
      status: s.status,
      isTerminated: s.status === 'TERMINATED',
      tabSwitchCount: s.tab_switch_count || 0,
      clipboardViolationCount: s.clipboard_violation_count || 0,
      terminationReason: s.termination_reason,
      terminatedAt: s.terminated_at,
      overallScore: s.overall_score,
      violations: vRes.rows
    });
  } catch (err) {
    console.error('[interviews/session/status] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/interviews/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = $1 AND status != 'ABANDONED' 
       ORDER BY created_at DESC`,
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

// GET /api/interviews/leaderboard — Supports platform and college-scoped leaderboards with transparent criteria
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { scope } = req.query; // 'college' or 'platform' (default)

    let collegeId = null;
    if (scope === 'college') {
      const cuRes = await db.query(
        "SELECT college_id FROM campus_users WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1",
        [req.user.id]
      );
      if (cuRes.rows.length > 0) {
        collegeId = cuRes.rows[0].college_id;
      }
    }

    let filterClause = "i.status = 'COMPLETED' AND i.overall_score IS NOT NULL";
    const params = [];
    if (collegeId) {
      filterClause += " AND u.id IN (SELECT user_id FROM campus_users WHERE college_id = $1 AND status = 'ACTIVE')";
      params.push(collegeId);
    }

    const query = `
      WITH RankedUsers AS (
        SELECT 
          u.id AS "userId",
          u.full_name AS "displayName",
          ROUND(AVG(i.overall_score)::numeric, 1) AS "averageScore",
          COUNT(i.id)::int AS "completedInterviews",
          ROUND(MAX(i.overall_score)::numeric, 1) AS "bestScore",
          MAX(i.completed_at) AS "latestCompletedAt"
        FROM users u
        JOIN interview_sessions i ON u.id = i.user_id
        WHERE ${filterClause}
        GROUP BY u.id, u.full_name
      ),
      LeaderboardWithRanks AS (
        SELECT 
          *,
          RANK() OVER (
            ORDER BY "averageScore" DESC, "completedInterviews" DESC, "bestScore" DESC, "latestCompletedAt" DESC
          ) as "rank"
        FROM RankedUsers
      )
      SELECT * FROM LeaderboardWithRanks
      ORDER BY "rank" ASC
    `;

    const result = await db.query(query, params);
    
    const allRanks = result.rows.map(row => ({
      ...row,
      rank: parseInt(row.rank),
      averageScore: parseFloat(row.averageScore),
      bestScore: parseFloat(row.bestScore)
    }));
    
    const top20 = allRanks.slice(0, 20);
    const userRank = allRanks.find(r => r.userId === req.user.id);
    
    res.json({ 
      scope: collegeId ? 'college' : 'platform',
      collegeId: collegeId || null,
      criteria: 'JobDM Leaderboard ranks verified users using their average score on completed mock interviews (normalized 0-100% scale), followed by completed sessions count and peak score. Incomplete and abandoned sessions are excluded.',
      totalParticipants: allRanks.length,
      leaderboard: top20,
      userRank: userRank || null
    });
  } catch (error) {
    console.error('[interviews/leaderboard] Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/interviews/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const metrics = await getStudentInterviewMetrics(req.user.id);
    res.json({
      totalInterviews: metrics.completedInterviews,
      avgScore: metrics.averageScore != null ? metrics.averageScore : null,
      totalMinutes: metrics.totalMinutes,
      totalSessions: metrics.totalSessions
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

    const violationsRes = await db.query(
      `SELECT id, violation_type, violation_count, details, created_at
       FROM session_violations
       WHERE session_id = $1 AND session_type = 'INTERVIEW'
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({ session: sessionRes.rows[0], qaPairs: qaRes.rows, violations: violationsRes.rows });
  } catch (error) {
    console.error('[interviews/report] Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
