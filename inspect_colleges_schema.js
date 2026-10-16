import db from './server/db.js';

async function run() {
  const res = await db.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'colleges'
    ORDER BY ordinal_position
  `);
  console.table(res.rows);
  process.exit(0);
}
run();
