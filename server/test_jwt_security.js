import assert from 'assert';
import jwt from 'jsonwebtoken';
import { validateJwtSecret, getJwtSecret } from './config/jwt.js';

console.log('--- Testing JWT Security & Startup Validation ---\n');

const ORIGINAL_ENV = { ...process.env };

try {
  // Test 1: Production mode rejects missing JWT_SECRET
  console.log('Test 1: Production rejects missing JWT_SECRET...');
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  assert.throws(
    () => validateJwtSecret({ exitOnError: false }),
    /\[CRITICAL SECURITY ERROR\]/,
    'Should throw critical error when JWT_SECRET is missing in production'
  );
  console.log('✓ Passed: Missing secret rejected in production.\n');

  // Test 2: Production rejects known weak secret ('fallback_secret')
  console.log('Test 2: Production rejects known weak secret fallback_secret...');
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'fallback_secret';
  assert.throws(
    () => validateJwtSecret({ exitOnError: false }),
    /\[CRITICAL SECURITY ERROR\]/,
    'Should throw critical error for fallback_secret'
  );
  console.log('✓ Passed: fallback_secret rejected in production.\n');

  // Test 3: Production rejects short secret (<32 chars)
  console.log('Test 3: Production rejects short secret...');
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = '12345678901234567890'; // 20 chars
  assert.throws(
    () => validateJwtSecret({ exitOnError: false }),
    /\[CRITICAL SECURITY ERROR\]/,
    'Should throw critical error for secrets shorter than 32 chars'
  );
  console.log('✓ Passed: Short secret rejected in production.\n');

  // Test 4: Production accepts strong 32+ char secret
  console.log('Test 4: Production accepts strong secret...');
  process.env.NODE_ENV = 'production';
  const strongSecret = 'a'.repeat(64);
  process.env.JWT_SECRET = strongSecret;
  const validatedSecret = validateJwtSecret({ exitOnError: false });
  assert.strictEqual(validatedSecret, strongSecret);
  console.log('✓ Passed: Strong secret accepted in production.\n');

  // Test 5: Invalidation of old tokens
  console.log('Test 5: Old tokens signed with fallback_secret are rejected by rotated secret...');
  const oldToken = jwt.sign({ id: 1, email: 'attacker@evil.com' }, 'fallback_secret');
  
  // Verify with rotated secret must throw JsonWebTokenError
  assert.throws(
    () => jwt.verify(oldToken, validatedSecret),
    (err) => err instanceof jwt.JsonWebTokenError,
    'Old token signed with fallback_secret must be rejected'
  );
  console.log('✓ Passed: Old tokens signed with fallback_secret are successfully invalidated.\n');

  // Test 6: Tokens signed with rotated secret verify properly
  console.log('Test 6: Tokens signed with rotated secret verify successfully...');
  const newToken = jwt.sign({ id: 42, email: 'student@college.edu' }, validatedSecret);
  const decoded = jwt.verify(newToken, validatedSecret);
  assert.strictEqual(decoded.id, 42);
  assert.strictEqual(decoded.email, 'student@college.edu');
  console.log('✓ Passed: Valid token signed with new secret verifies properly.\n');

  console.log('All JWT security tests passed successfully!');
} finally {
  process.env = ORIGINAL_ENV;
}
