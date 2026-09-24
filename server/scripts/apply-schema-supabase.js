/**
 * apply-schema-supabase.js
 * Applies backend_schema.sql to Supabase using the REST API (SQL editor endpoint).
 * Works without psql or direct DB port access.
 *
 * Usage: node scripts/apply-schema-supabase.js
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const { config } = await import('dotenv');
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(`
❌ Missing environment variables.

Add these two lines to your .env file:
  SUPABASE_URL=https://vtzksmxlscsaxaswoaxe.supabase.co
  SUPABASE_SERVICE_KEY=your_service_role_key_here

Get the service key from:
  Supabase Dashboard → Settings → API → service_role (secret key)
`);
  process.exit(1);
}

const schemaPath = resolve(__dirname, '../../backend_schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

// Split into individual statements (Supabase REST only runs one at a time)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📋 Found ${statements.length} SQL statements to execute...\n`);

let success = 0;
let skipped = 0;
let failed  = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i] + ';';
  const preview = stmt.slice(0, 80).replace(/\n/g, ' ');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ query: stmt })
  });

  if (response.ok) {
    console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}`);
    success++;
  } else {
    const body = await response.text();
    // "already exists" errors are fine — schema is idempotent
    if (body.includes('already exists') || body.includes('duplicate')) {
      console.log(`  ⏭  [${i + 1}/${statements.length}] Already exists — skipped`);
      skipped++;
    } else {
      console.error(`  ❌ [${i + 1}/${statements.length}] FAILED: ${body.slice(0, 120)}`);
      failed++;
    }
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`✅ Success: ${success}  |  ⏭  Skipped: ${skipped}  |  ❌ Failed: ${failed}`);
if (failed === 0) {
  console.log('\n🎉 Schema applied successfully! You can now restart the backend.');
}
