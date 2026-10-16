import db from '../server/db.js';

(async () => {
  const client = await db.pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('interviews', 'coding_attempts', 'coding_history', 'daily_task_submissions', 'aptitude_sessions', 'interview_sessions')
      ORDER BY table_name, column_name;
    `);
    console.table(res.rows);
  } finally {
    client.release();
    process.exit(0);
  }
})();
