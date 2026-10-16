import db from '../server/db.js';

async function check() {
  const c = await db.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('interview_sessions', 'coding_sessions', 'session_violations') 
    ORDER BY table_name, ordinal_position
  `);
  console.log(JSON.stringify(c.rows, null, 2));
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
