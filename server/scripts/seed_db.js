import fs from 'fs';
import db from '../db.js';

async function seed() {
  const data = JSON.parse(fs.readFileSync('c:/interviewiq/server/scripts/batch1_seed.json', 'utf8'));
  let totalSeeded = 0;
  let testCasesCount = 0;

  for (const p of data) {
    try {
      await db.query(
        `INSERT INTO coding_problems (id, title, topic, difficulty, description, input_format, output_format, constraints, hints, starter_code, wrapper_metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.title, p.topic, p.difficulty, p.description, p.input_format, p.output_format, 
         JSON.stringify(p.constraints), JSON.stringify(p.hints), JSON.stringify(p.starter_code), JSON.stringify(p.metadata)]
      );

      // check if test cases already exist to ensure idempotence
      const existingTc = await db.query('SELECT COUNT(*) FROM coding_test_cases WHERE problem_id = $1', [p.id]);
      if (parseInt(existingTc.rows[0].count, 10) === 0) {
        for (const tc of p.test_cases) {
          await db.query(
            `INSERT INTO coding_test_cases (problem_id, input, expected_output, is_hidden)
             VALUES ($1, $2, $3, $4)`,
            [p.id, tc.input, tc.expected_output, tc.is_hidden]
          );
          testCasesCount++;
        }
      }
      totalSeeded++;
    } catch (err) {
      console.error(`Failed to insert problem ${p.title}: `, err.message);
    }
  }

  console.log(`\n--- BATCH 1 SEEDING COMPLETE ---`);
  console.log(`Total problems processed: ${totalSeeded}`);
  console.log(`New test cases inserted: ${testCasesCount}`);
  
  const stats = await db.query('SELECT topic, difficulty, COUNT(*) FROM coding_problems GROUP BY topic, difficulty');
  console.log("Distribution:", stats.rows);

  const total = await db.query('SELECT COUNT(*) FROM coding_problems');
  console.log("Total unique problems in DB:", total.rows[0].count);
  
  process.exit(0);
}

seed();
