import db from './server/db.js';

async function check() {
  const res = await db.query(
    "SELECT problem_id, is_hidden, count(*) FROM coding_test_cases WHERE problem_id IN ('dsa-str-001', 'dsa-ht-001', 'dsa-arr-101') GROUP BY problem_id, is_hidden ORDER BY problem_id"
  );
  console.log("Test Cases Distribution:", res.rows);
  
  const p1Attempts = await db.query("SELECT COUNT(*) FROM coding_attempts WHERE problem_id = 'p1'");
  console.log("Attempts for p1:", p1Attempts.rows[0].count);
  
  const allAttempts = await db.query("SELECT COUNT(*) FROM coding_attempts");
  console.log("Total Attempts:", allAttempts.rows[0].count);
  
  process.exit(0);
}
check();
