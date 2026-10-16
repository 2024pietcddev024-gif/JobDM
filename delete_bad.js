import db from './server/db.js';

async function del() {
  const res = await db.query("DELETE FROM coding_problems WHERE id = 'dsa-b6-${idCounter++}'");
  console.log(`Deleted ${res.rowCount} rows`);
  process.exit(0);
}
del();
