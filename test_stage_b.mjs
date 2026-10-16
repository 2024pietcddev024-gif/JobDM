
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
  console.log('=== Stage B AI Review Tests ===\n');

  const token = await register(`stage_b_test_${randomBytes(4).toString('hex')}@example.com`);
  const problemId = 'dsa-div-2';
  
  // ── 1. Correct Answer ──
  console.log('\n--- Testing Correct Answer ---');
  const correctCode = 'class Solution:\n    def solve(self, nums):\n        return [x for x in nums if x % 2 == 0]';
  const { data: d1 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: correctCode }, token);
  assert('Submit verdict is correct', d1.status === 'success');
  
  const { status: s1r, data: review1 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: correctCode,
    testResult: d1
  }, token);
  assert('Evaluate code returns 200', s1r === 200);
  assert('Verdict mapped to correct', review1.verdict === 'correct');
  assert('Time complexity populated', review1.timeComplexity && review1.timeComplexity !== 'Unknown');
  assert('Mistake explanation is N/A or Unknown (because correct)', review1.mistakeExplanation === 'N/A' || review1.mistakeExplanation === 'Unknown');
  assert('Review Status is success', review1.reviewStatus === 'success');
  assert('Learning topics provided', review1.learningTopics && review1.learningTopics !== 'Unknown');

  // ── 2. Incorrect Answer ──
  console.log('\n--- Testing Incorrect Answer ---');
  const wrongCode = 'class Solution:\n    def solve(self, nums):\n        return [x for x in nums if x % 2 == 1]'; // odd instead of even
  const { data: d2 } = await req('POST', '/code/submit', { problemId, language: 'Python', code: wrongCode }, token);
  assert('Submit verdict is wrong_answer', d2.status === 'wrong_answer');
  
  const { data: review2 } = await req('POST', '/interviews/evaluate-code', {
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: wrongCode,
    testResult: d2
  }, token);
  console.log(review2);
  assert('Verdict mapped to incorrect', review2.verdict === 'incorrect');
  assert('Mistake location provided', review2.mistakeLocation && review2.mistakeLocation !== 'Unknown' && review2.mistakeLocation !== 'None');
  assert('Mistake explanation provided', review2.mistakeExplanation && review2.mistakeExplanation !== 'Unknown' && review2.mistakeExplanation !== 'N/A');
  assert('Corrected code provided', review2.correctedCode && review2.correctedCode.includes('2 == 0'));

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  pool.end();
}

run().catch(e => { console.error('Fatal:', e); pool.end(); });
