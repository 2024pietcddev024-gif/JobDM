import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Manually load .env from two directories up (c:\interviewiq\.env)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Use dotenv directly — node scripts/ runs without the injector hook
const dotenvPath = resolve(__dirname, '../../.env');
const { config } = await import('dotenv');
config({ path: dotenvPath });
console.log('[init-db] Loading .env from:', dotenvPath);

const dbUrl = process.env.DATABASE_URL;


if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
  console.error('❌ DATABASE_URL is not set or invalid. Check your .env file.');
  process.exit(1);
}

const schemaPath = resolve(__dirname, '../../backend_schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('📋 Running backend_schema.sql...');
    await client.query(sql);
    console.log('✅ Schema applied successfully!');

    // Quick sanity check
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    console.log('\n📦 Tables created:');
    tables.rows.forEach(r => console.log('  -', r.tablename));
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
