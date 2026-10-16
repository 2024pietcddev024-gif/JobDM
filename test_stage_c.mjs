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

async function run() {
  const token = await register(`indent_test_${randomBytes(4).toString('hex')}@example.com`);
  const problemId = 'dsa-div-2';
  
  const indentCode = 'class Solution:\n    def solve(self, nums):\n   return []';
  const rRes = await fetch(`${API_URL}/code/submit`, { method:'POST', headers:{'Content-Type':'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify({problemId, language:'Python', code:indentCode}) });
  const d4 = await rRes.json();
  
  const evRes = await fetch(`${API_URL}/interviews/evaluate-code`, { method:'POST', headers:{'Content-Type':'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify({
    problemTitle: 'Find Elements Divisible by 2',
    problemDescription: 'Given an array of integers nums, return a new array containing only the elements that are divisible by 2.',
    inputFormat: 'A list of integers.',
    outputFormat: 'A list of integers.',
    constraints: '',
    examples: [],
    language: 'Python',
    code: indentCode,
    testResult: d4
  }) });
  console.log(await evRes.json());
}
run();
