import db from '../server/db.js';

async function main() {
  const problems = await db.query(`
    SELECT DISTINCT ON (topic) id, title, topic, difficulty, wrapper_metadata, starter_code
    FROM coding_problems
    ORDER BY topic, id
  `);
  console.log("Distinct topic problems count:", problems.rows.length);
  for (const p of problems.rows) {
    const tcs = await db.query('SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = $1 LIMIT 2', [p.id]);
    console.log(`\n[${p.topic}] ${p.title} (ID: ${p.id})`);
    console.log(`  Meta:`, p.wrapper_metadata);
    console.log(`  Python starter:`, JSON.stringify(p.starter_code?.Python));
    console.log(`  Java starter:`, JSON.stringify(p.starter_code?.Java));
    console.log(`  C++ starter:`, JSON.stringify(p.starter_code?.['C++']));
    if (tcs.rows[0]) console.log(`  Sample TC: In: ${tcs.rows[0].input} -> Out: ${tcs.rows[0].expected_output}`);
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
