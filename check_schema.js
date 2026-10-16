import db from './server/db.js';

async function checkSchema() {
  const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'aptitude_questions'");
  console.log(res.rows);
  process.exit(0);
}

checkSchema();
