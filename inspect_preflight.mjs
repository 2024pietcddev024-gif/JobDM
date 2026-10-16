import db from './server/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  // Inspect actual coding_problems columns
  const cols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coding_problems' ORDER BY ordinal_position`);
  console.log('=== coding_problems columns ===');
  console.log(cols.rows);

  // Count and sample
  const count = await db.query("SELECT COUNT(*) as total FROM coding_problems");
  console.log('\n=== total problems ===', count.rows[0]);

  const sample = await db.query("SELECT id, title, topic, difficulty FROM coding_problems LIMIT 5");
  console.log('\n=== sample problems ===');
  console.log(sample.rows);

  // Check coding_solved columns
  const scols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coding_solved' ORDER BY ordinal_position`);
  console.log('\n=== coding_solved columns ===');
  console.log(scols.rows);

  // Check coding_test_cases columns
  const tccols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coding_test_cases' ORDER BY ordinal_position`);
  console.log('\n=== coding_test_cases columns ===');
  console.log(tccols.rows);

  // Check wrapper_metadata sample
  const wm = await db.query("SELECT id, wrapper_metadata FROM coding_problems WHERE wrapper_metadata IS NOT NULL LIMIT 2");
  console.log('\n=== wrapper_metadata sample ===');
  console.log(JSON.stringify(wm.rows, null, 2));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
