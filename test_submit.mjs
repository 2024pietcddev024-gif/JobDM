const PORT = 3001;
const API_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Phase 3.1 Tests ===");

  // 1. Register a test user
  const ts = Date.now();
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Submit Tester', email: `test_${ts}@example.com`, password: 'password123' })
  });
  const regData = await regRes.json();
  const token = regData.token;

  if (!token) {
    console.error("Failed to register test user", regData);
    return;
  }
  console.log("[Test Setup] User registered successfully");

  // We need a problem ID to test against. Let's find one.
  // Actually, we can fetch from DB using the admin route, or just create a dummy one directly in pg.
  // Since we don't have pg in node-fetch script without installing, let's just assume "dsa-div-1" (Two Sum) exists.
  const problemId = 'dsa-div-2'; 

  // 2. Unauthenticated submission is rejected
  const unauthRes = await fetch(`${API_URL}/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemId, language: 'Python', code: 'def solve(): return 1' })
  });
  console.log(`[Test 5] Unauthenticated: status = ${unauthRes.status} (Expected 401)`);

  // 3. Guest /run remains functional
  const guestRunRes = await fetch(`${API_URL}/code/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'Python', code: 'def solve(nums): return [x for x in nums if x % 2 == 0]', testCases: [{input: '[2,3,4]', expectedOutput: '[2,4]'}], problemTitle: 'Find Elements Divisible by 2' })
  });
  const guestRunData = await guestRunRes.json();
  console.log(`[Test 6] Guest /run: status = ${guestRunRes.status}, execStatus = ${guestRunData.status} (Expected success)`);

  // 4. Missing problem ID returns controlled error
  const missingRes = await fetch(`${API_URL}/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ problemId: 'invalid-prob-999', language: 'Python', code: 'def solve(): return 1' })
  });
  const missingData = await missingRes.json();
  console.log(`[Test 7] Missing problem ID: status = ${missingRes.status}, error = ${missingData.error} (Expected 404 / Problem not found)`);

  // 5. Correct solution passes trusted test cases
  const correctCode = `
def solve(nums):
    return [x for x in nums if x % 2 == 0]
`;
  const correctRes = await fetch(`${API_URL}/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ problemId, language: 'Python', code: correctCode })
  });
  const correctData = await correctRes.json();
  console.log(`[Test 1] Correct solution HTTP status: ${correctRes.status}`);
  console.log(`[Test 1] Correct solution body:`, correctData);

  // 6. Incorrect solution fails
  const incorrectCode = `
def solve(nums):
    return []
`;
  const incorrectRes = await fetch(`${API_URL}/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ problemId, language: 'Python', code: incorrectCode })
  });
  const incorrectData = await incorrectRes.json();
  console.log(`[Test 2] Incorrect solution HTTP status: ${incorrectRes.status}`);
  console.log(`[Test 2] Incorrect solution body:`, incorrectData);

  // 7. Hidden test details not exposed
  // We can look at the output of the correct/incorrect run
  if (correctData.results) {
    const hasHiddenOutputs = correctData.results.some(r => r.actualOutput === 'Hidden (Passed)');
    console.log(`[Test 9] Hidden tests masked in correct data? ${hasHiddenOutputs}`);
  }
  
  if (incorrectData.results) {
    const hasHiddenFailedOutputs = incorrectData.results.some(r => r.actualOutput === 'Hidden (Failed)');
    console.log(`[Test 9] Hidden tests masked in incorrect data? ${hasHiddenFailedOutputs}`);
  }
}

runTests().catch(console.error);
