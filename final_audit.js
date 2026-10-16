import db from './server/db.js';

async function audit() {
  try {
    const totalCount = await db.query("SELECT COUNT(*) FROM coding_problems");
    console.log("Total coding_problems:", totalCount.rows[0].count);

    const approvedCount = await db.query("SELECT COUNT(*) FROM coding_problems WHERE id NOT LIKE 'dsa-div-%'");
    console.log("Quality-approved count (excluding dsa-div-):", approvedCount.rows[0].count);

    const topics = await db.query("SELECT topic, COUNT(*) FROM coding_problems WHERE id NOT LIKE 'dsa-div-%' GROUP BY topic ORDER BY topic");
    console.log("\nApproved Topic Counts:");
    console.log(topics.rows);

    const difficulties = await db.query("SELECT difficulty, COUNT(*) FROM coding_problems WHERE id NOT LIKE 'dsa-div-%' GROUP BY difficulty ORDER BY difficulty");
    console.log("\nApproved Difficulty Counts:");
    console.log(difficulties.rows);

    const duplicateIDs = await db.query("SELECT id, COUNT(*) FROM coding_problems GROUP BY id HAVING COUNT(*) > 1");
    console.log("\nDuplicate IDs:", duplicateIDs.rows);

    const duplicateTitles = await db.query("SELECT title, COUNT(*) FROM coding_problems GROUP BY title HAVING COUNT(*) > 1");
    console.log("\nDuplicate Titles:", duplicateTitles.rows);

    const testCases = await db.query("SELECT COUNT(*) FROM coding_test_cases");
    console.log("\nTotal Test Cases:", testCases.rows[0].count);

    const attempts = await db.query("SELECT COUNT(*) FROM coding_attempts");
    console.log("Total Attempts:", attempts.rows[0].count);

    const users = await db.query("SELECT COUNT(*) FROM users");
    console.log("Total Users:", users.rows[0].count);

    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
audit();
