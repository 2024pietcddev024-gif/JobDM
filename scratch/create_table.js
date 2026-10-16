import db from '../server/db.js';

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS aptitude_generated_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        question_hash VARCHAR(255) NOT NULL,
        question_id UUID REFERENCES aptitude_questions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_question_hash UNIQUE(user_id, question_hash)
      );
    `);
    console.log('table created');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
