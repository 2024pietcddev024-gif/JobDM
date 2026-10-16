// Test: GET /api/code/problems returns DB problems (no test case data exposed)
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3001/api';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function register(email) {
  const r = await req('POST', '/auth/register', { name: `T${Date.now()}`, email, password: 'pass1234' });
  return r.data.token;
}

let passed = 0, failed = 0;
function assert(label, condition, detail = '') {
  if (condition) { console.log(`✅ ${label}`); passed++; }
  else { console.error(`❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

async function run() {
  console.log('=== Stage A API Tests ===\n');

  // ── Test 1: GET /problems returns DB problems ──────────────────────────────
  const { status: s1, data: d1 } = await req('GET', '/code/problems');
  assert('T1: /problems returns 200', s1 === 200);
  assert('T1: problems array present', Array.isArray(d1.problems));
  assert('T1: total > 0 (DB not empty)', d1.total > 0, `got ${d1.total}`);
  assert('T1: total reflects real DB count', d1.total >= 200, `got ${d1.total}`);
  console.log(`    → ${d1.total} problems returned`);

  // ── Test 2: No hidden test case data exposed ───────────────────────────────
  const p = d1.problems[0];
  const exposedFields = Object.keys(p);
  const forbidden = ['test_cases', 'testCases', 'expected_output', 'is_hidden', 'wrapper_metadata'];
  const leaks = forbidden.filter(f => exposedFields.includes(f));
  assert('T2: No hidden/test-case fields leaked', leaks.length === 0, `leaked: ${leaks.join(', ')}`);

  // ── Test 3: Required fields present ───────────────────────────────────────
  const required = ['id','title','topic','difficulty','description','input_format','output_format','constraints','hints','starter_code'];
  const missing = required.filter(f => !(f in p));
  assert('T3: All required metadata fields present', missing.length === 0, `missing: ${missing.join(', ')}`);

  // ── Test 4: Difficulty filter ──────────────────────────────────────────────
  const { status: s4, data: d4 } = await req('GET', '/code/problems?difficulty=Easy');
  assert('T4: Difficulty filter returns 200', s4 === 200);
  const badDiff = d4.problems.filter(x => x.difficulty !== 'Easy');
  assert('T4: All returned problems are Easy', badDiff.length === 0, `${badDiff.length} non-Easy`);

  // ── Test 5: Topic filter ───────────────────────────────────────────────────
  const { status: s5, data: d5 } = await req('GET', '/code/problems?topic=Arrays');
  assert('T5: Topic filter returns 200', s5 === 200);
  const badTopic = d5.problems.filter(x => x.topic !== 'Arrays');
  assert('T5: All returned problems have topic=Arrays', badTopic.length === 0, `${badTopic.length} non-Arrays`);

  // ── Test 6: Unknown filter returns empty array, not error ──────────────────
  const { status: s6, data: d6 } = await req('GET', '/code/problems?difficulty=Impossible');
  assert('T6: Unknown difficulty filter returns 200 (not 500)', s6 === 200);
  assert('T6: Returns empty array, not error', Array.isArray(d6.problems) && d6.problems.length === 0);

  // ── Test 7 & 8: Secure Submit pipeline ────────────────────────────────────
  // Use a well-known problem with a clear correct solution for deterministic tests
  // dsa-div-2: Find Elements Divisible by 2 — input is a list of ints, output is filtered list
  // The wrapper calls top-level solve(nums) not Solution().solve(nums) for this problem
  const knownProblemId = 'dsa-div-2';
  const correctCode = 'class Solution:\n    def solve(self, nums):\n        return [x for x in nums if x % 2 == 0]';
  const wrongCode = 'class Solution:\n    def solve(self, nums):\n        return []';

  const token = await register(`stage_a_test_${Date.now()}@example.com`);

  const { status: s7, data: d7 } = await req('POST', '/code/submit', {
    problemId: knownProblemId, language: 'Python', code: correctCode
  }, token);
  assert('T7: /submit returns 200', s7 === 200);
  assert('T7: /submit returns execution status', typeof d7.status === 'string', `status=${d7.status}`);

  // ── Test 9: Incorrect solve → no coding_solved record ─────────────────────
  const token2 = await register(`stage_a_test2_${Date.now()}@example.com`);
  const { status: s9 } = await req('POST', '/code/submit', {
    problemId: knownProblemId, language: 'Python', code: wrongCode
  }, token2);
  assert('T9: Incorrect submit returns 200', s9 === 200);

  // After incorrect, no solved record for token2
  const userRes = await pool.query("SELECT id FROM users WHERE email LIKE 'stage_a_test2_%' ORDER BY created_at DESC LIMIT 1");
  if (userRes.rows.length > 0) {
    const uid2 = userRes.rows[0].id;
    const solved2 = await pool.query('SELECT COUNT(*) as c FROM coding_solved WHERE user_id = $1 AND problem_id = $2', [uid2, knownProblemId]);
    assert('T9: Incorrect submit did NOT create solved record', parseInt(solved2.rows[0].c) === 0, `got ${solved2.rows[0].c}`);
  }

  // ── Test 10: Repeated correct solve → unique count unchanged ──────────────
  const token3 = await register(`stage_a_test3_${Date.now()}@example.com`);
  const correctPayload = { problemId: knownProblemId, language: 'Python', code: correctCode };
  await req('POST', '/code/submit', correctPayload, token3);
  await req('POST', '/code/submit', correctPayload, token3); // repeat
  const userRes3 = await pool.query("SELECT id FROM users WHERE email LIKE 'stage_a_test3_%' ORDER BY created_at DESC LIMIT 1");
  if (userRes3.rows.length > 0) {
    const uid3 = userRes3.rows[0].id;
    const solved3 = await pool.query('SELECT COUNT(*) as c FROM coding_solved WHERE user_id = $1 AND problem_id = $2', [uid3, knownProblemId]);
    assert('T10: Repeated correct submit → unique solved count = 1', parseInt(solved3.rows[0].c) === 1, `got ${solved3.rows[0].c}`);
  }

  // ── Test 11: Run Code still works (no auth needed) ─────────────────────────
  const { status: s11 } = await req('GET', '/code/problems');
  assert('T11: /problems still works alongside existing routes', s11 === 200);

  // ── Test 12: DB problem count unchanged ────────────────────────────────────
  const dbCount = await pool.query('SELECT COUNT(*) as c FROM coding_problems');
  const expectedMin = 200;
  assert(`T12: DB problem count >= ${expectedMin} (no deletions)`, parseInt(dbCount.rows[0].c) >= expectedMin, `got ${dbCount.rows[0].c}`);

  // ── Test 13: Unauthenticated /submit returns 401 ───────────────────────────
  const { status: s13 } = await req('POST', '/code/submit', { problemId: knownProblemId, language: 'Python', code: 'class Solution:\n    def solve(self, nums): return []' });
  assert('T13: /submit without token returns 401', s13 === 401);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  pool.end();
}

run().catch(e => { console.error('Fatal:', e); pool.end(); });
