import db from '../server/db.js';

async function run() {
  try {
    await db.query(`ALTER TABLE interview_sessions ADD COLUMN coding_language VARCHAR(50);`);
    console.log("Added coding_language to interview_sessions");
  } catch (e) {
    console.log(e.message);
  }

  try {
    await db.query(`ALTER TABLE users ADD COLUMN preferred_coding_language VARCHAR(50);`);
    console.log("Added preferred_coding_language to users");
  } catch (e) {
    console.log(e.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS coding_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        problem_id VARCHAR(100) NOT NULL,
        language VARCHAR(50) NOT NULL,
        code_content TEXT,
        status VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created coding_attempts table");
  } catch(e) { console.log(e.message); }

  try {
     await db.query(`ALTER TABLE users ADD COLUMN practice_languages JSONB;`);
     console.log("Added practice_languages to users");
  } catch (e) { console.log(e.message); }
  process.exit(0);
}
run();
