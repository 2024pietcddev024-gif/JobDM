const API_URL = 'http://localhost:3001/api';

async function testFlow() {
  console.log('--- STARTING API TESTS ---');
  
  // 1. Login to get a token
  let token = null;
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'api_test_user_2@example.com', password: 'password123' }) 
    });
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      token = data.token;
    } else {
      // Register a test user
      const regRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'api_test_user_2@example.com', password: 'password123', name: 'API Tester 2' })
      });
      const data = await regRes.json();
      token = data.token;
    }
    
    if (!token) throw new Error('Could not get auth token');
    console.log('[PASS] Authentication');
  } catch (err) {
    console.error('[FAIL] Authentication', err.message);
    return;
  }
  
  // 2. Test starting a session with insufficient questions (Ex: 10 Easy Logical Reasoning, but only 1 exists)
  try {
    const startRes = await fetch(`${API_URL}/aptitude/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category: 'Logical Reasoning', difficulty: 'Easy', count: 10 })
    });
    
    if (startRes.status === 400) {
      const data = await startRes.json();
      if (data.available === 1) {
         console.log('[PASS] Requested count strictly respected (returned 400 when insufficient)');
      } else {
         console.log('[FAIL] Incorrect available count returned');
      }
    } else {
      console.log(`[FAIL] Expected 400, got ${startRes.status}`);
    }
  } catch(err) {
    console.error('[FAIL] Start Session Test 1', err.message);
  }
  
  // 3. Test starting a valid session (count: 1)
  let sessionId = null;
  let qId = null;
  try {
    const startRes = await fetch(`${API_URL}/aptitude/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category: 'Logical Reasoning', difficulty: 'Easy', count: 1 })
    });
    
    if (startRes.ok) {
      const data = await startRes.json();
      sessionId = data.sessionId;
      qId = data.questions[0].id;
      
      if (data.questions[0].correct_answer) {
        console.log('[FAIL] Backend Security: Sent correct answer to frontend');
      } else {
        console.log('[PASS] Backend Security: No correct answer sent during start');
      }
      
      console.log('[PASS] Valid session start');
    } else {
      console.log(`[FAIL] Start session with count 1 failed: ${startRes.status}`);
    }
  } catch(err) {
    console.error('[FAIL] Start Session Test 2', err.message);
  }
  
  // 4. Test Submit
  try {
    const submitRes = await fetch(`${API_URL}/aptitude/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        sessionId, 
        answers: [{ questionId: qId, userAnswer: '(1/8)' }],
        durationMinutes: 1
      })
    });
    
    if (submitRes.ok) {
      const data = await submitRes.json();
      if (data.score === 100) {
        console.log('[PASS] Submit API accepted and scored correctly');
      }
    } else {
      console.log(`[FAIL] Submit session failed: ${submitRes.status}`);
    }
  } catch(err) {
    console.error('[FAIL] Submit Session Test', err.message);
  }
  
  // 5. Test Never Repeat a Question (Exhausted Bank)
  try {
    const startRes2 = await fetch(`${API_URL}/aptitude/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category: 'Logical Reasoning', difficulty: 'Easy', count: 1 })
    });
    
    if (startRes2.status === 404) {
       console.log('[PASS] Exclude previously attempted questions (Bank Exhausted)');
    } else {
       console.log(`[FAIL] Expected 404 bank exhausted, got ${startRes2.status}`);
    }
  } catch(err) {
    console.error('[FAIL] Exclusion Test', err.message);
  }
  
  // 6. Test Difficulty Filter Exactness (Try Medium for Logical Reasoning, where none exist)
  try {
    const startRes3 = await fetch(`${API_URL}/aptitude/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category: 'Logical Reasoning', difficulty: 'Medium', count: 1 })
    });
    
    if (startRes3.status === 404) {
       console.log('[PASS] Exact Difficulty Filtering (Found 0 Medium LR questions)');
    } else {
       console.log(`[FAIL] Expected 404 for Medium LR, got ${startRes3.status}`);
    }
  } catch(err) {
    console.error('[FAIL] Difficulty Filter Test', err.message);
  }
}

testFlow();
