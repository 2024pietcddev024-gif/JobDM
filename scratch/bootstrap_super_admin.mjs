import db from '../server/db.js';

async function main() {
  // Find the most recently active user based on coding attempts or interview sessions
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

  if (activeRes.rows.length === 0) {
    console.log("No users found.");
    process.exit(1);
  }

  const userId = activeRes.rows[0].user_id;
  const userRes = await db.query('SELECT id, email, full_name FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];

  console.log(`Most recently active user: ${user.id} (${user.email})`);

  // Check if they are already in campus_users
  const campusRes = await db.query('SELECT * FROM campus_users WHERE user_id = $1', [userId]);
  if (campusRes.rows.length > 0) {
    console.log(`User already has a campus identity: ${campusRes.rows[0].system_role}`);
    process.exit(0);
  }

  // Insert SUPER_ADMIN
  try {
    await db.query('BEGIN');
    await db.query(`
      INSERT INTO campus_users (user_id, college_id, system_role, status)
      VALUES ($1, NULL, 'SUPER_ADMIN', 'ACTIVE')
    `, [userId]);
    await db.query('COMMIT');
    console.log('Successfully inserted SUPER_ADMIN identity.');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error inserting identity:', err);
    process.exit(1);
  }

  // Verify
  const verifyRes = await db.query('SELECT user_id, college_id, system_role, status FROM campus_users WHERE user_id = $1', [userId]);
  console.log('Verification:', verifyRes.rows[0]);

  process.exit(0);
}
main();
