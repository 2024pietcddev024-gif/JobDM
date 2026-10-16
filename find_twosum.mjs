import db from './server/db.js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const r = await db.query("SELECT id, title FROM coding_problems WHERE lower(title) LIKE '%two sum%'");
  console.log(r.rows);
  // Also find a problem that works via test_submit.mjs - it uses the first problem from coding_problems
  const first = await db.query('SELECT id, title FROM coding_problems LIMIT 5');
  console.log('first 5:', first.rows.map(r => r.id + ' ' + r.title));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
