import db from './server/db.js';

async function check() {
  const users = await db.query("SELECT id, full_name, email FROM users WHERE email = 'arjun@gmail.com'");
  if (users.rows.length === 0) {
    console.log('Arjun not found');
    process.exit(0);
  }
  const arjun = users.rows[0];
  console.log('Arjun user:', arjun);

  const sessions = await db.query(
    "SELECT id, category, role, difficulty, overall_score, status, completed_at, duration_minutes, created_at FROM interview_sessions WHERE user_id = $1 ORDER BY created_at ASC",
    [arjun.id]
  );
  console.log(`Found ${sessions.rows.length} sessions for Arjun:`);
  console.table(sessions.rows);

  process.exit(0);
}
check();
