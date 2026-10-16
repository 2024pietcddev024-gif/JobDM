import pg from 'pg';
import { randomBytes } from 'crypto';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.vtzksmxlscsaxaswoaxe:qq4EJY%40aG4dL%24Ga@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

const API_URL = 'http://localhost:3001/api';

async function register(email) {
  const password = 'Password123!';
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password })
  });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return data.token;
}

const req = async (method, path, body, token = null) => {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
};

let passed = 0;
let failed = 0;
function assert(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

async function run() {
  console.log('=== Stage B AI Review Tests - Extended ===\n');

  const token = await register(`stage_b_test_ext_${randomBytes(4).toString('hex')}@example.com`);
  const problemId = 'dsa-div-2';
  
  // ── 3. Compilation Error ──
  console.log('\n--- Testing Compilation Error ---');
  const compileErrorCode = 'class Solution:\n    def solve(self, nums)\n        return []'; // Missing colon
  const { data: d3 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: compileErrorCode }, token);
  assert('Submit verdict is compilation_error', d3.status === 'compilation_error');
  
  const { data: review3 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: compileErrorCode,
    testResult: d3
  }, token);
  
  assert('Verdict mapped to compilation_error', review3.verdict === 'compilation_error' || review3.verdict === 'incorrect'); // mappedVerdict transforms it
  assert('Mistake explanation provided', review3.mistakeExplanation && review3.mistakeExplanation !== 'Unknown' && review3.mistakeExplanation !== 'N/A');

  // ── 4. Runtime Error ──
  console.log('\n--- Testing Runtime Error ---');
  const runtimeErrorCode = 'class Solution:\n    def solve(self, nums):\n        return [x for x in nums if x / 0 == 0]'; // Divide by zero
  const { data: d4 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: runtimeErrorCode }, token);
  assert('Submit verdict is runtime_error', d4.status === 'runtime_error');
  
  const { data: review4 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: runtimeErrorCode,
    testResult: d4
  }, token);
  
  console.log('review4', review4);
  assert('Verdict mapped to runtime_error', review4.verdict === 'runtime_error' || review4.verdict === 'incorrect');
  assert('Mistake explanation provided', review4.mistakeExplanation && review4.mistakeExplanation !== 'Unknown' && review4.mistakeExplanation !== 'N/A');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  pool.end();
}

run().catch(e => { console.error('Fatal:', e); pool.end(); });
