import db from './server/db.js';

async function run() {
  const r = await db.query("SELECT id, title FROM coding_problems LIMIT 5");
  console.log(r.rows);
  
  const pId = r.rows[0].id;
  const tc = await db.query("SELECT * FROM coding_test_cases WHERE problem_id = $1", [pId]);
  console.log('TCs for', pId, tc.rows);
  process.exit(0);
}
run();
