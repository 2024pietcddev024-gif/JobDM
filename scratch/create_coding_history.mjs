import db from '../server/db.js';

async function createTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS coding_question_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      question_id VARCHAR(255) REFERENCES coding_problems(id) ON DELETE CASCADE,
      question_hash VARCHAR(64) NOT NULL,
      title VARCHAR(255),
      normalized_problem TEXT,
      topic VARCHAR(100),
      difficulty VARCHAR(50),
      source_type VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, question_hash)
    );
  `);
  console.log('Table created');
}
createTable().catch(console.error).finally(() => process.exit(0));
