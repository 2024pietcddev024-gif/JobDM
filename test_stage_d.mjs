import { randomBytes } from 'crypto';

const API_URL = 'http://localhost:3001/api';

async function register(email) {
  const password = 'Password123!';
  const res1 = await fetch(`${API_URL}/auth/register`, {
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
  console.log('=== Stage D Fallback Tutor Tests ===\n');

  const token = await register(`stage_d_test_${randomBytes(4).toString('hex')}@example.com`);
  const problemId = 'dsa-div-2';
  
  // 1. Empty / pass-only solution
  console.log('\n--- Testing Empty/Pass-only Solution ---');
  const passCode = 'class Solution:\n    def solve(self, nums):\n        pass';
  const { data: d1 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: passCode }, token);
  assert('Submit verdict is wrong_answer', d1.status === 'wrong_answer');
  
  const { data: review1 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: passCode,
    testResult: d1
  }, token);
  
  assert('Review source is fallback or AI', review1.reviewSource === 'rule_based_fallback' || review1.reviewSource === 'ai');
  
  // 2. Syntax Error
  console.log('\n--- Testing Syntax Error ---');
  const syntaxCode = 'class Solution:\n    def solve(self, nums)\n        return []';
  const { data: d2 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: syntaxCode }, token);
  assert('Submit verdict is compilation_error', d2.status === 'compilation_error');
  
  const { data: review2 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: syntaxCode,
    testResult: d2
  }, token);
  
  assert('Verdict mapped to incorrect/compilation_error', review2.verdict === 'incorrect' || review2.verdict === 'compilation_error');

  // 3. Runtime Error
  console.log('\n--- Testing Runtime Error ---');
  const runCode = 'class Solution:\n    def solve(self, nums):\n        return [x for x in nums if x / 0 == 0]';
  const { data: d3 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: runCode }, token);
  assert('Submit verdict is runtime_error', d3.status === 'runtime_error');
  
  const { data: review3 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: runCode,
    testResult: d3
  }, token);
  
  assert('Verdict mapped to incorrect/runtime_error', review3.verdict === 'incorrect' || review3.verdict === 'runtime_error');
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
}

run().catch(e => { console.error('Fatal:', e); });
