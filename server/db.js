import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Force IPv4 lookup first in Node.js on Windows to prevent getaddrinfo ENOTFOUND on dual-stack hosts (Supabase pooler)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

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
    ssl: { rejectUnauthorized: false }, // Required for Supabase
    connectionTimeoutMillis: 10000,     // 10s timeout to connect (prevents indefinite hanging)
    idleTimeoutMillis: 30000,           // Close idle clients after 30s
    max: 20,                            // Support up to 20 concurrent connections
    keepAlive: true,                    // Keep TCP connection alive
    keepAliveInitialDelayMillis: 10000
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
  if (!pool) {
    const err = new Error('Database service is not configured. Please check DATABASE_URL in .env.');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    // If connection was dropped, attempt one immediate retry
    if (err.code === 'ECONNRESET' || err.code === '57P01' || err.message?.includes('Connection terminated')) {
      console.warn('[DB] Connection dropped, retrying query once...');
      return await pool.query(text, params);
    }
    throw err;
  }
};

export const getClient = async () => {
  if (!pool) {
    const err = new Error('Database service is not configured. Please check DATABASE_URL in .env.');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  return pool.connect();
};

export default {
  query,
  getClient,
  get pool() { return pool; }
};
