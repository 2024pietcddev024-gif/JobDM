import db from '../server/db.js';

async function main() {
  const r = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'coding_attempts' AND column_name = 'created_at'");
  console.log(r.rows);
  process.exit(0);
}
main();
