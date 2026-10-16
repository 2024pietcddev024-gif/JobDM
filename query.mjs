import db from './server/db.js';

async function run() {
  const r = await db.query("SELECT title, input_format, output_format, wrapper_metadata FROM coding_problems WHERE title IN ('Two Sum', 'Binary Tree Level Order Traversal')");
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
}
run();
