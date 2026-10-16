import db from './server/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const tc = await db.query(
    "SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = 'dsa-div-2' ORDER BY id"
  );
  console.log('dsa-div-2 test cases:', JSON.stringify(tc.rows, null, 2));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
