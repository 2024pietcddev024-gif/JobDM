import db from './server/db.js';

async function audit() {
  try {
    console.log('=== ALL TABLES IN DB ===');
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(tables.rows.map(r => r.table_name).join(', '));

    console.log('\n=== USERS MATCHING "arjun" ===');
    const users = await db.query(`
      SELECT id, full_name, email, target_role, target_level, streak_days 
      FROM users 
      WHERE email ILIKE '%arjun%' OR full_name ILIKE '%arjun%'
    `);
    console.table(users.rows);

    for (const u of users.rows) {
      console.log(`\n=== SESSIONS FOR USER: ${u.email} (${u.id}) ===`);
      const sessions = await db.query(`
        SELECT id, category, role, difficulty, overall_score, duration_minutes, summary, created_at, assigned_by
        FROM interview_sessions
        WHERE user_id = $1
      `, [u.id]);
      console.table(sessions.rows);
    }

    console.log('\n=== ALL INTERVIEW SESSIONS IN DB ===');
    const allSessions = await db.query(`
      SELECT s.id, s.user_id, u.full_name, u.email, s.category, s.role, s.overall_score, s.duration_minutes, s.created_at
      FROM interview_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    console.table(allSessions.rows);

  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    process.exit(0);
  }
}

audit();
