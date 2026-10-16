import db from './server/db.js';

async function migrate() {
  try {
    await db.query(`ALTER TABLE aptitude_questions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
    console.log("Migration successful.");
  } catch(e) {
    console.error("Migration failed:", e.message);
  }
  process.exit(0);
}

migrate();
