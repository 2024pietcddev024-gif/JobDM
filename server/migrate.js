import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllMigrations() {
  console.log('================================================================');
  console.log('🚀 RUNNING DATABASE INITIALIZATION & MIGRATIONS');
  console.log('================================================================');

  try {
    // 1. Test database connection
    const testRes = await db.query('SELECT current_database(), current_user, version()');
    console.log(`✅ [CONNECTED] Database: ${testRes.rows[0].current_database} | User: ${testRes.rows[0].current_user}`);
    console.log(`   Version: ${testRes.rows[0].version.split('\n')[0]}`);

    // 2. Apply base schema if users table does not exist
    const checkUsers = await db.query(`
      SELECT to_regclass('public.users') as exists
    `);
    if (!checkUsers.rows[0]?.exists) {
      console.log('\n📄 Base schema not detected. Applying backend_schema.sql...');
      const schemaPath = path.resolve(__dirname, '../backend_schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await db.query(sql);
        console.log('✅ Base schema applied successfully.');
      } else {
        console.warn('⚠️ backend_schema.sql not found, skipping base schema.');
      }
    } else {
      console.log('✅ Base schema already present (users table exists).');
    }

    // 3. Run numbered migrations sequentially
    const migrationsDir = path.resolve(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    console.log(`\n📦 Found ${files.length} migration files in server/migrations:`);
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\n⏳ Running migration: ${file}...`);
      try {
        execSync(`node "${filePath}"`, { stdio: 'inherit' });
        console.log(`✅ ${file} applied successfully.`);
      } catch (err) {
        console.error(`❌ Migration failed on ${file}:`, err.message);
        throw err;
      }
    }

    console.log('\n================================================================');
    console.log('🎉 ALL SUPABASE DATABASE MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Database initialization/migration error:', err.message);
    process.exit(1);
  }
}

runAllMigrations();
