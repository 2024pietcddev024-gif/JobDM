import db from './server/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const p = await db.query('SELECT id, title FROM coding_problems ORDER BY id LIMIT 1');
  const prob = p.rows[0];
  console.log('Problem:', prob.id, prob.title);

  const tc = await db.query(
    "SELECT input, expected_output FROM coding_test_cases WHERE problem_id = $1 AND is_hidden = false LIMIT 2",
    [prob.id]
  );
  console.log('Public test cases:', JSON.stringify(tc.rows, null, 2));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
