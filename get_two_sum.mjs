import db from './server/db.js';

async function run() {
  const r = await db.query("SELECT id FROM coding_problems WHERE title = 'Two Sum'");
  console.log(r.rows);
  process.exit(0);
}
run();
