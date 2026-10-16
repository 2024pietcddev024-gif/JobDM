import db from './server/db.js';

async function run() {
  const attempts = await db.query("SELECT problem_id, language, status, created_at FROM coding_attempts ORDER BY created_at DESC LIMIT 5");
  console.log('Attempts:', attempts.rows);
  const solved = await db.query("SELECT problem_id, language, solved_at FROM coding_solved ORDER BY solved_at DESC LIMIT 5");
  console.log('Solved:', solved.rows);
  process.exit(0);
}
run();
