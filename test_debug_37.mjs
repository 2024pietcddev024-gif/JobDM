import dotenv from 'dotenv';
dotenv.config();

const BASE = `http://localhost:3001/api`;

// Step 1: Login to get token
async function login() {
  // Try to register first (may fail if user already exists)
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'TestUser3.7', email: 'test37@interviewiq.test', password: 'Test1234!' })
  }).catch(() => {});
  
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test37@interviewiq.test', password: 'Test1234!' })
  });
  const data = await res.json();
  if (!data.token) throw new Error('Login failed: ' + JSON.stringify(data));
  return data.token;
}

// Step 2: Get problems list
async function getProblems(token) {
  const res = await fetch(`${BASE}/code/problems`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

// Step 3: Inspect a specific problem's test cases from DB (via submit dry-run)
async function submitCode(token, problemId, language, code) {
  const res = await fetch(`${BASE}/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ problemId, language, code })
  });
  return res.json();
}

// Step 4: Check progress
async function getProgress(token) {
  const res = await fetch(`${BASE}/code/progress`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

console.log('=== Phase 3.7 Debug Suite ===\n');

try {
  const token = await login();
  console.log('✅ Login OK');

  const { problems, total } = await getProblems(token);
  console.log(`✅ Problems: ${total} loaded`);
  
  // Pick first easy problem
  const easy = problems.find(p => p.difficulty === 'Easy') || problems[0];
  console.log(`\n📌 Testing problem: "${easy.title}" (id=${easy.id}, topic=${easy.topic})`);

  // Check progress before
  const progressBefore = await getProgress(token);
  console.log(`\n📊 Progress before submit: solved=${progressBefore.totalSolved}`);

  // Submit correct Python code for a generic easy problem
  // We use a trivial correct-looking solution that returns pass but might pass
  console.log('\n--- Submit 1: Placeholder (should be rejected as incomplete) ---');
  const r1 = await submitCode(token, easy.id, 'Python', 'def solve(input):\n    pass');
  console.log('Status:', r1.status, '| passedCount:', r1.passedCount, '| totalCount:', r1.totalCount);
  if (r1.error) console.log('Error:', r1.error);

  // Submit with wrong answer
  console.log('\n--- Submit 2: Wrong answer ---');
  const r2 = await submitCode(token, easy.id, 'Python', `def solve(input):\n    return -999999`);
  console.log('Status:', r2.status, '| passedCount:', r2.passedCount, '| totalCount:', r2.totalCount);
  if (r2.compileError) console.log('CompileError:', r2.compileError?.substring(0, 300));
  if (r2.runtimeError) console.log('RuntimeError:', r2.runtimeError?.substring(0, 300));
  if (r2.results) console.log('First result:', JSON.stringify(r2.results[0]));

  // Check progress after wrong answer
  const progressAfter2 = await getProgress(token);
  console.log(`\n📊 Progress after wrong answer: solved=${progressAfter2.totalSolved} (should be unchanged)`);

  // Check if first problem has test cases in DB
  const db = (await import('./server/db.js')).default;
  const tcRes = await db.query('SELECT COUNT(*) FROM coding_test_cases WHERE problem_id = $1', [easy.id]);
  console.log(`\n🗄️  Test cases in DB for "${easy.title}": ${tcRes.rows[0].count}`);
  
  // Check a sample of problems for test case coverage
  const coverageRes = await db.query(`
    SELECT cp.id, cp.title, COUNT(ctc.id) as tc_count 
    FROM coding_problems cp 
    LEFT JOIN coding_test_cases ctc ON cp.id = ctc.problem_id 
    GROUP BY cp.id, cp.title 
    ORDER BY tc_count ASC 
    LIMIT 10
  `);
  console.log('\n🗄️  Problems with fewest test cases:');
  coverageRes.rows.forEach(r => console.log(`  - "${r.title}": ${r.tc_count} test cases`));

  const noTcRes = await db.query(`
    SELECT COUNT(*) FROM coding_problems cp 
    LEFT JOIN coding_test_cases ctc ON cp.id = ctc.problem_id 
    WHERE ctc.id IS NULL
  `);
  console.log(`\n⚠️  Problems with ZERO test cases: ${noTcRes.rows[0].count}`);
  
  await db.end();
} catch(e) {
  console.error('FATAL:', e.message);
  console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
}
