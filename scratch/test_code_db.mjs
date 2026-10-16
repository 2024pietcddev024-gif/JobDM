import db from '../server/db.js';

async function test() {
  const userIdRes = await db.query('SELECT id FROM users LIMIT 1');
  if (userIdRes.rows.length === 0) return console.log('No users found.');
  const userId = userIdRes.rows[0].id;
  
  const recentSolvedAttemptsRes = await db.query(
    `SELECT problem_id, created_at 
     FROM coding_attempts 
     WHERE user_id = $1 AND status = 'solved' AND created_at >= NOW() - INTERVAL '48 HOURS'`,
    [userId]
  );
  console.log('recentSolvedAttempts (coding_attempts):', recentSolvedAttemptsRes.rows);

  const solvedRes = await db.query(
    `SELECT cs.problem_id, cs.language, cs.solved_at, cp.title, cp.topic, cp.difficulty
     FROM coding_solved cs
     JOIN coding_problems cp ON cs.problem_id = cp.id
     WHERE cs.user_id = $1
     ORDER BY cs.solved_at DESC`,
    [userId]
  );
  console.log('solvedList (coding_solved):', solvedRes.rows);
}
test().catch(console.error).finally(() => process.exit(0));
