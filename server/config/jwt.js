import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KNOWN_WEAK_SECRETS = new Set([
  'fallback_secret',
  'secret',
  'jwt_secret',
  'your_long_random_jwt_secret_here',
  'your_long_random_secret_here',
  'changeme',
  'password',
  '12345678',
  'admin'
]);

const MIN_SECRET_LENGTH = 32;
let hasWarnedInDev = false;

/**
 * Validates the JWT_SECRET from environment variables.
 * In production:
 *   - Fails fast and terminates application startup (process.exit(1)) if missing or weak.
 * In development / test:
 *   - Issues a security warning and allows a dev-safe fallback for local development.
 *
 * @param {Object} [options]
 * @param {boolean} [options.exitOnError=true] - Whether to call process.exit(1) on failure in production.
 * @returns {string} The validated JWT secret.
 */
export function validateJwtSecret(options = { exitOnError: true }) {
  const rawSecret = process.env.JWT_SECRET;
  const secret = typeof rawSecret === 'string' ? rawSecret.trim() : '';
  const isProduction = process.env.NODE_ENV === 'production';

  const isMissing = !secret;
  const isKnownWeak = KNOWN_WEAK_SECRETS.has(secret.toLowerCase());
  const isTooShort = secret.length < MIN_SECRET_LENGTH;

  if (isMissing || isKnownWeak || isTooShort) {
    let reason = '';
    if (isMissing) {
      reason = 'JWT_SECRET environment variable is not defined or is empty.';
    } else if (isKnownWeak) {
      reason = `JWT_SECRET is set to an insecure default/placeholder ('${secret}').`;
    } else if (isTooShort) {
      reason = `JWT_SECRET is too short (${secret.length} chars). Minimum required length is ${MIN_SECRET_LENGTH} characters.`;
    }

    if (isProduction) {
      console.error('\n' + '='.repeat(80));
      console.error(' [CRITICAL SECURITY ERROR] Application Startup Aborted');
      console.error('='.repeat(80));
      console.error(`Reason: ${reason}`);
      console.error('Running in production with an unset or predictable JWT secret allows attackers');
      console.error('to forge tokens and impersonate any user or administrator.');
      console.error('\nRemediation:');
      console.error('  1. Generate a cryptographically strong 256-bit+ secret:');
      console.error('     node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
      console.error('  2. Set JWT_SECRET in your production environment variables / .env.');
      console.error('='.repeat(80) + '\n');

      if (options.exitOnError !== false) {
        process.exit(1);
      }
      throw new Error(`[CRITICAL SECURITY ERROR] ${reason}`);
    } else {
      if (!hasWarnedInDev) {
        console.warn(`[SECURITY WARNING] JWT_SECRET: ${reason}`);
        console.warn('[SECURITY WARNING] In production, the server will fail to start. Using fallback for local development.');
        hasWarnedInDev = true;
      }
      return secret || 'dev_insecure_jwt_secret_do_not_use_in_prod';
    }
  }

  return secret;
}

/**
 * Returns the current validated JWT secret.
 * @returns {string}
 */
export function getJwtSecret() {
  return validateJwtSecret({ exitOnError: true });
}
