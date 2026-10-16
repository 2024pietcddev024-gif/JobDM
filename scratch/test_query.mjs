import db from '../server/db.js';

async function main() {
  const r = await db.query("SELECT date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' as start_of_utc_day");
  console.log(r.rows);
  process.exit(0);
}
main();
