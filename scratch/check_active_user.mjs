import db from '../server/db.js';

async function main() {
  const activeRes = await db.query(`
    SELECT user_id, MAX(created_at) as last_active
    FROM (
      SELECT user_id, created_at FROM coding_attempts
      UNION ALL
      SELECT user_id, created_at FROM interview_sessions
      UNION ALL
      SELECT id as user_id, created_at FROM users
    ) active_users
    GROUP BY user_id
    ORDER BY last_active DESC
    LIMIT 1
  `);

  const userId = activeRes.rows[0].user_id;
  const userRes = await db.query('SELECT id, email, full_name, name FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];

  console.log(`Most recently active user: ${user.id} (${user.email})`);
  process.exit(0);
}
main();
