import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || '';

// Detect misconfigured URL (must be a postgres:// connection string, not an HTTPS URL)
const isValidDbUrl = dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));

if (dbUrl && !isValidDbUrl) {
  console.warn(
    '[DB] DATABASE_URL looks invalid — it must be a PostgreSQL connection string like:\n' +
    '  postgresql://user:password@host:5432/dbname\n' +
    'Your Supabase connection string is found at: Dashboard → Settings → Database → Connection string (URI mode).\n' +
    'The database layer will be unavailable until this is corrected.'
  );
}

let pool = null;

if (isValidDbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client:', err.message);
    // Do NOT process.exit here — let the server keep running and return 503 on DB ops
  });

  // Test connection on startup
  pool.connect()
    .then(client => {
      console.log('[DB] Connected to PostgreSQL database.');
      client.release();
    })
    .catch(err => {
      console.error('[DB] Failed to connect to database:', err.message);
    });
} else {
  console.warn('[DB] No valid DATABASE_URL — running without database. Auth and history endpoints will fail.');
}

export const query = async (text, params) => {
  if (!pool) throw new Error('Database not configured. Set a valid DATABASE_URL in .env');
  return pool.query(text, params);
};

export default {
  query,
  get pool() { return pool; }
};
