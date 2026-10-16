import { randomBytes } from 'crypto';

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
  console.log('=== Stage E Final Audit Tests ===\n');

  const token = await register(`stage_e_test_${randomBytes(4).toString('hex')}@example.com`);
  const problemId = 'dsa-div-2';
  
  // 1. Progress Before Any Submission
  console.log('\n--- Checking Initial Progress ---');
  let { data: prog1 } = await req('GET', '/code/progress', null, token);
  assert('Total Solved is 0', prog1.totalSolved === 0);
  assert('Total Attempted is 0', prog1.totalAttempted === 0);
  
  // 2. Submit Syntax Error
  console.log('\n--- Submitting Syntax Error ---');
  const syntaxCode = 'class Solution:\n    def solve(self, nums)\n        return []';
  await req('POST', '/code/submit', { problemId, language: 'Python', code: syntaxCode }, token);
  
  let { data: prog2 } = await req('GET', '/code/progress', null, token);
  assert('Total Solved remains 0', prog2.totalSolved === 0);
  assert('Total Attempted is 1', prog2.totalAttempted === 1);
  assert('Total Submissions is 1', prog2.totalSubmissions === 1);

  // 3. Submit Correct Solution
  console.log('\n--- Submitting Correct Solution ---');
  const correctCode = 'class Solution:\n    def solve(self, nums):\n        return [x for x in nums if x % 2 == 0]';
  await req('POST', '/code/submit', { problemId, language: 'Python', code: correctCode }, token);
  
  let { data: prog3 } = await req('GET', '/code/progress', null, token);
  assert('Total Solved is 1', prog3.totalSolved === 1);
  assert('Total Attempted is 1', prog3.totalAttempted === 1);
  assert('Total Submissions is 2', prog3.totalSubmissions === 2);
  
  // 4. Submit Correct Solution Again (Duplicates)
  console.log('\n--- Submitting Duplicate Correct Solution ---');
  await req('POST', '/code/submit', { problemId, language: 'Python', code: correctCode }, token);
  
  let { data: prog4 } = await req('GET', '/code/progress', null, token);
  assert('Total Solved is still 1 (No inflation)', prog4.totalSolved === 1);
  assert('Total Attempted is 1', prog4.totalAttempted === 1);
  assert('Total Submissions is 3', prog4.totalSubmissions === 3);
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
}

run().catch(e => { console.error('Fatal:', e); });
