import db from '../server/db.js';

async function main() {
  try {
    const p = await db.query('SELECT * FROM coding_problems WHERE title = $1', ['Best Time to Buy and Sell Stock']);
    console.log('Problem:', p.rows);
    if (p.rows.length > 0) {
      const tc = await db.query('SELECT * FROM coding_test_cases WHERE problem_id = $1', [p.rows[0].id]);
      console.log('Test Cases:', tc.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
