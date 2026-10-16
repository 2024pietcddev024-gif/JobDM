import db from '../server/db.js';

async function checkAllInputs() {
  const res = await db.query('SELECT DISTINCT input FROM coding_test_cases LIMIT 50');
  console.log("Sample test case inputs (first 50):");
  for (const row of res.rows) {
    console.log(row.input);
  }

  // Count how many start with [[ or have multiple args
  const total = await db.query('SELECT COUNT(*) FROM coding_test_cases');
  const bracketBracket = await db.query("SELECT COUNT(*) FROM coding_test_cases WHERE input LIKE '[[%'");
  console.log(`\nTotal test cases: ${total.rows[0].count}`);
  console.log(`Inputs starting with '[[': ${bracketBracket.rows[0].count}`);

  process.exit(0);
}

checkAllInputs().catch(err => { console.error(err); process.exit(1); });
