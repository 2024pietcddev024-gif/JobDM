import express from 'express';
import crypto from 'crypto';
import { authenticateToken, authenticateOptional } from './auth.js';
import db from '../db.js';
import { simulateCodeExecution, generateCodingProblem } from '../services/aiEngine.js';

const router = express.Router();

// GET /api/code/problems — public-safe problem library (no test case data exposed)
router.get('/problems', authenticateOptional, async (req, res) => {
  try {
    const { topic, difficulty } = req.query;

    const conditions = [];
    const params = [];

    if (topic) {
      params.push(topic);
      conditions.push(`topic = $${params.length}`);
    }
    if (difficulty) {
      params.push(difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ').replace(/difficulty/g, 'cp.difficulty').replace(/topic/g, 'cp.topic')}` : '';

    const result = await db.query(
      `SELECT
         cp.id,
         cp.title,
         cp.topic,
         cp.difficulty,
         cp.description,
         cp.input_format,
         cp.output_format,
         cp.constraints,
         cp.hints,
         cp.starter_code,
         (
           SELECT COALESCE(json_agg(
             json_build_object(
               'input', tc.input,
               'output', tc.expected_output,
               'explanation', tc.explanation
             )
           ), '[]'::json)
           FROM coding_test_cases tc
           WHERE tc.problem_id = cp.id AND tc.is_hidden = false
         ) as examples
       FROM coding_problems cp
       ${where}
       ORDER BY
         CASE cp.difficulty WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Hard' THEN 3 ELSE 4 END,
         cp.topic,
         cp.title`,
      params
    );

    res.json({
      problems: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('[code/problems] error:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

router.post('/record-served', authenticateToken, async (req, res) => {
  const { problemId } = req.body;
  if (!problemId) return res.status(400).json({ error: 'problemId is required' });

  try {
    const userId = req.user.id;
    // get problem details to populate history
    const probRes = await db.query('SELECT title, description, topic, difficulty, wrapper_metadata FROM coding_problems WHERE id = $1', [problemId]);
    if (probRes.rows.length === 0) return res.status(404).json({ error: 'Problem not found' });
    
    const p = probRes.rows[0];
    const sourceType = p.wrapper_metadata?.sourceType || 'original';
    const questionHash = crypto.createHash('sha256').update(problemId).digest('hex');

    await db.query(
      `INSERT INTO coding_question_history 
       (user_id, question_id, question_hash, title, normalized_problem, topic, difficulty, source_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, question_hash) DO NOTHING`,
      [userId, problemId, questionHash, p.title, p.description, p.topic, p.difficulty, sourceType]
    );

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[code/record-served] error:', err);
    res.status(500).json({ error: 'Failed to record served problem' });
  }
});

router.post('/generate', authenticateToken, async (req, res) => {
  const { topic, difficulty } = req.body;
  if (!topic || !difficulty) {
    return res.status(400).json({ error: 'Topic and difficulty are required' });
  }

  try {
    const userId = req.user.id;

    // First check if there's an existing unused problem that matches
    const existingRes = await db.query(
      `SELECT cp.* FROM coding_problems cp
       LEFT JOIN coding_question_history cqh ON cqh.question_id = cp.id AND cqh.user_id = $1
       WHERE cp.topic = $2 AND cp.difficulty = $3 AND cqh.id IS NULL
       ORDER BY RANDOM() LIMIT 1`,
      [userId, topic, difficulty]
    );

    if (existingRes.rows.length > 0) {
      const q = existingRes.rows[0];
      // Need to fetch examples for it so the UI can format it
      const examplesRes = await db.query(
        `SELECT input, expected_output as output, explanation 
         FROM coding_test_cases 
         WHERE problem_id = $1 AND is_hidden = false`,
        [q.id]
      );
      
      const sourceType = q.wrapper_metadata?.sourceType || 'original';
      const questionHash = crypto.createHash('sha256').update(q.id).digest('hex');

      await db.query(
        `INSERT INTO coding_question_history 
         (user_id, question_id, question_hash, title, normalized_problem, topic, difficulty, source_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, question_hash) DO NOTHING`,
        [userId, q.id, questionHash, q.title, q.description, q.topic, q.difficulty, sourceType]
      );

      return res.json({
        problem: {
          id: q.id,
          title: q.title,
          topic: q.topic,
          difficulty: q.difficulty,
          description: q.description,
          inputFormat: q.input_format,
          outputFormat: q.output_format,
          constraints: q.constraints,
          hints: q.hints,
          starterCode: q.starter_code,
          examples: examplesRes.rows,
          tags: [q.topic],
          category: q.topic,
          testCases: []
        }
      });
    }

    // Get past QA for this user to avoid duplicates
    // Fetch ALL questions ever served to this user
    const pastQARes = await db.query(
      `SELECT title, normalized_problem as description
       FROM coding_question_history
       WHERE user_id = $1`,
      [userId]
    );

    const pastQA = pastQARes.rows.map(r => r.title + " " + r.description);

    const generated = await generateCodingProblem({ topic, difficulty, pastQA });

    const newId = 'gemini-' + crypto.randomUUID();

    await db.query(
      `INSERT INTO coding_problems 
       (id, title, topic, difficulty, description, input_format, output_format, constraints, hints, starter_code, wrapper_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newId, generated.title, topic, difficulty,
        (generated.caseStudy ? `**Case Study:**\n${generated.caseStudy}\n\n` : '') + generated.description,
        generated.inputFormat, generated.outputFormat,
        JSON.stringify(generated.constraints || []),
        JSON.stringify(generated.hints || []),
        JSON.stringify(generated.starterCode || {}),
        JSON.stringify({ sourceType: generated.sourceType, company: generated.company })
      ]
    );

    for (let i = 0; i < generated.testCases.length; i++) {
      const tc = generated.testCases[i];
      // Make first 2 visible, rest hidden
      const isHidden = i >= 2;
      const tcId = crypto.randomUUID();
      await db.query(
        `INSERT INTO coding_test_cases (id, problem_id, input, expected_output, is_hidden, explanation)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tcId, newId, tc.input, tc.expectedOutput, isHidden, tc.explanation || null]
      );
    }

    const questionHash = crypto.createHash('sha256').update(newId).digest('hex');
    await db.query(
      `INSERT INTO coding_question_history 
       (user_id, question_id, question_hash, title, normalized_problem, topic, difficulty, source_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, question_hash) DO NOTHING`,
      [userId, newId, questionHash, generated.title, generated.description, topic, difficulty, generated.sourceType]
    );

    res.json({
      problem: {
        id: newId,
        title: generated.title,
        topic: topic,
        difficulty: difficulty,
        description: (generated.caseStudy ? `**Case Study:**\n${generated.caseStudy}\n\n` : '') + generated.description,
        inputFormat: generated.inputFormat,
        outputFormat: generated.outputFormat,
        constraints: generated.constraints || [],
        hints: generated.hints || [],
        starterCode: generated.starterCode || {},
        examples: generated.testCases.slice(0, 2).map(tc => ({
           input: tc.input,
           output: tc.expectedOutput,
           explanation: tc.explanation || null
        })),
        tags: [topic],
        category: topic,
        testCases: []
      }
    });

  } catch (err) {
    console.error('[code/generate] error:', err);
    res.status(500).json({ error: err.message || 'AI coding question generation is temporarily unavailable. Please try again.' });
  }
});

router.post('/run', authenticateOptional, async (req, res) => {
  const { language, code, problemId } = req.body;

  if (!language || !code || !problemId) {
    return res.status(400).json({ error: 'Language, code, and problemId are required' });
  }

  // Detect empty or placeholder code server-side for safety
  const trimmed = code.trim();
  const placeholders = ['pass', 'return null;', '// Write your solution here', '# Write your solution here', 'return 0;'];
  
  // Basic check: if it's too short or literally just the placeholder
  if (trimmed.length < 5 || placeholders.some(p => trimmed === p)) {
    return res.json({
      status: 'incomplete',
      error: 'Please implement the solution before running the test cases.'
    });
  }

  try {
    const probRes = await db.query('SELECT title, wrapper_metadata FROM coding_problems WHERE id = $1', [problemId]);
    if (probRes.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const problemTitle = probRes.rows[0].title;
    const wrapperMetadata = probRes.rows[0].wrapper_metadata;

    const tcRes = await db.query('SELECT input, expected_output FROM coding_test_cases WHERE problem_id = $1 AND is_hidden = false ORDER BY id', [problemId]);
    const testCases = tcRes.rows.map(tc => ({
      input: tc.input,
      expectedOutput: tc.expected_output,
      isHidden: false
    }));

    const result = await simulateCodeExecution({ language, code, testCases, problemTitle, wrapperMetadata });
    res.json(result);
  } catch (error) {
    console.error('[API] /run error:', error);
    res.status(500).json({ error: 'Failed to execute code' });
  }
});

router.post('/attempt', authenticateToken, async (req, res) => {
  const { problemId, language, code, status } = req.body;
  if (!problemId || !language) return res.status(400).json({ error: 'Missing fields' });

  try {
    await db.query(
      `INSERT INTO coding_attempts (user_id, problem_id, language, code_content, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, problemId, language, code, status]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[code/attempt] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total submission attempts
    const attemptsRes = await db.query(
      `SELECT COUNT(*) as count FROM coding_attempts WHERE user_id = $1`,
      [userId]
    );
    const totalSubmissions = parseInt(attemptsRes.rows[0].count, 10);

    // 2. Total attempted unique problems
    const uniqueAttemptsRes = await db.query(
      `SELECT COUNT(DISTINCT problem_id) as count FROM coding_attempts WHERE user_id = $1`,
      [userId]
    );
    const totalAttempted = parseInt(uniqueAttemptsRes.rows[0].count, 10);

    // 3. Solved problems detailed breakdown
    const solvedRes = await db.query(
      `SELECT cs.problem_id, cs.language, cs.solved_at, cp.title, cp.topic, cp.difficulty
       FROM coding_solved cs
       JOIN coding_problems cp ON cs.problem_id = cp.id
       WHERE cs.user_id = $1
       ORDER BY cs.solved_at DESC`,
      [userId]
    );
    
    const solvedList = solvedRes.rows.map(row => ({
      problemId: row.problem_id,
      title: row.title,
      topic: row.topic,
      difficulty: row.difficulty,
      language: row.language,
      solvedAt: row.solved_at
    }));

    const totalSolved = solvedList.length;
    
    const solvedByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
    const solvedByTopic = {};
    const solvedByLanguage = {};

    solvedList.forEach(p => {
      if (p.difficulty) solvedByDifficulty[p.difficulty] = (solvedByDifficulty[p.difficulty] || 0) + 1;
      if (p.topic) solvedByTopic[p.topic] = (solvedByTopic[p.topic] || 0) + 1;
      if (p.language) solvedByLanguage[p.language] = (solvedByLanguage[p.language] || 0) + 1;
    });

    const recentSolved = solvedList.slice(0, 5);

    // 4. Served List
    const servedRes = await db.query(
      `SELECT question_id FROM coding_question_history WHERE user_id = $1`,
      [userId]
    );
    const servedList = servedRes.rows.map(row => row.question_id);

    // Legacy progress array for backward compatibility
    const oldProgressRes = await db.query(
      `SELECT language, status, COUNT(*) as count 
       FROM coding_attempts 
       WHERE user_id = $1 
       GROUP BY language, status`,
      [userId]
    );

    // 5. Recent successful attempts (for Daily Goal calculation in frontend)
    // Fetch attempts from the last 48 hours to safely cover any local timezone
    const recentSolvedAttemptsRes = await db.query(
      `SELECT problem_id, created_at 
       FROM coding_attempts 
       WHERE user_id = $1 AND status = 'solved' AND created_at >= NOW() - INTERVAL '48 HOURS'`,
      [userId]
    );
    const recentSolvedAttempts = recentSolvedAttemptsRes.rows.map(row => ({
      problemId: row.problem_id,
      solvedAt: row.created_at
    }));

    res.json({
      progress: oldProgressRes.rows, // Backward compatibility
      totalSolved,
      totalAttempted,
      totalSubmissions,
      solvedByDifficulty,
      solvedByTopic,
      solvedByLanguage,
      recentSolved,
      solvedList,
      servedList,
      recentSolvedAttempts
    });
  } catch (err) {
    console.error('[code/progress] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/submit', authenticateToken, async (req, res) => {
  const { problemId, language, code } = req.body;
  if (!problemId || !language || !code) {
    return res.status(400).json({ error: 'problemId, language, and code are required' });
  }

  // Detect empty or placeholder code server-side for safety
  const trimmed = code.trim();
  const placeholders = ['pass', 'return null;', '// Write your solution here', '# Write your solution here', 'return 0;'];
  
  if (trimmed.length < 5 || placeholders.some(p => trimmed === p)) {
    return res.json({
      status: 'incomplete',
      error: 'Please implement the solution before running the test cases.'
    });
  }

  try {
    const probRes = await db.query('SELECT title, wrapper_metadata FROM coding_problems WHERE id = $1', [problemId]);
    if (probRes.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const problemTitle = probRes.rows[0].title;
    const wrapperMetadata = probRes.rows[0].wrapper_metadata;

    const tcRes = await db.query('SELECT * FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', [problemId]);
    if (tcRes.rows.length === 0) {
      return res.status(404).json({ error: 'No test cases found for problem' });
    }

    const dbTestCases = tcRes.rows.map(tc => ({
      input: tc.input,
      expectedOutput: tc.expected_output,
      isHidden: tc.is_hidden
    }));

    const execResult = await simulateCodeExecution({ language, code, testCases: dbTestCases, problemTitle, wrapperMetadata });

    // Derive correctness status based on server-side evaluation
    let dbStatus = 'attempted';
    if (execResult.status === 'success') dbStatus = 'solved';
    else if (execResult.status === 'compilation_error') dbStatus = 'compilation_error';
    else if (execResult.status === 'time_limit_exceeded') dbStatus = 'time_limit_exceeded';
    else if (execResult.status === 'runtime_error') dbStatus = 'runtime_error';
    else if (execResult.status === 'wrong_answer') dbStatus = 'wrong_answer';
    else if (execResult.status === 'error') dbStatus = 'error';

    // Mask hidden test cases in response
    if (execResult.results) {
      execResult.results = execResult.results.map((res, i) => {
        const tc = dbTestCases[i];
        if (tc && tc.isHidden) {
           return {
             testCaseIndex: res.testCaseIndex,
             passed: res.passed,
             isRuntimeError: res.isRuntimeError,
             actualOutput: res.passed ? 'Hidden (Passed)' : (res.isRuntimeError ? 'Hidden (Runtime Error)' : 'Hidden (Failed)'),
             expectedOutput: 'Hidden'
           };
        }
        return res;
      });
    }

    // Save attempt only after server-side evaluation
    await db.query(
      `INSERT INTO coding_attempts (user_id, problem_id, language, code_content, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, problemId, language, code, dbStatus]
    );

    // Also populate coding_solved if success
    if (dbStatus === 'solved') {
      try {
        await db.query(
          `INSERT INTO coding_solved (user_id, problem_id, language) VALUES ($1, $2, $3)
           ON CONFLICT (user_id, problem_id) DO UPDATE SET language = EXCLUDED.language`,
          [req.user.id, problemId, language]
        );
      } catch (err) {
        console.warn('[code/submit] error inserting into coding_solved:', err.message);
      }
    }

    res.json(execResult);
  } catch (error) {
    console.error('[code/submit] error:', error);
    res.status(500).json({ error: 'Server error during submission' });
  }
});

export default router;
