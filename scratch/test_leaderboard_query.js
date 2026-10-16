import db from '../server/db.js';

async function test() {
  try {
    const result = await db.query(`
      SELECT 
        u.id AS "userId",
        u.full_name AS "displayName",
        ROUND((AVG(i.overall_score) * 10)::numeric, 1) AS "averageScore",
        COUNT(i.id)::int AS "completedInterviews",
        ROUND((MAX(i.overall_score) * 10)::numeric, 1) AS "bestScore"
      FROM users u
      JOIN interview_sessions i ON u.id = i.user_id
      WHERE i.overall_score IS NOT NULL
      GROUP BY u.id, u.full_name
      ORDER BY 
        "averageScore" DESC, 
        "completedInterviews" DESC, 
        "bestScore" DESC, 
        MAX(i.created_at) DESC
      LIMIT 20
    `);
    console.log(result.rows);
  } catch(e) {
    console.error('DB ERROR:', e.message);
  }
  process.exit(0);
}

test();
