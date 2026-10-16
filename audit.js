import db from './server/db.js';

async function audit() {
  try {
    const q1 = await db.query("SELECT topic, difficulty, COUNT(*) FROM coding_problems WHERE id NOT LIKE 'dsa-div-%' GROUP BY topic, difficulty ORDER BY topic, difficulty");
    console.log("Quality Approved (id not like dsa-div-%):");
    console.log(q1.rows);
    
    const q2 = await db.query("SELECT topic, difficulty, COUNT(*) FROM coding_problems WHERE id LIKE 'dsa-div-%' GROUP BY topic, difficulty ORDER BY topic, difficulty");
    console.log("\nLegacy (id like dsa-div-%):");
    console.log(q2.rows);

    let easy = 0, med = 0, hard = 0;
    q1.rows.forEach(r => {
      let c = parseInt(r.count);
      if (r.difficulty === 'Easy') easy += c;
      if (r.difficulty === 'Medium') med += c;
      if (r.difficulty === 'Hard') hard += c;
    });
    console.log(`\nTotals Approved: Easy=${easy}, Medium=${med}, Hard=${hard}, Total=${easy+med+hard}`);
    
    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
audit();
