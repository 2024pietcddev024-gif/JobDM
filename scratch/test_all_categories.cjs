
const http = require('http');

async function testCategory(token, category, count) {
  return new Promise(resolve => {
    const req = http.request('http://localhost:3001/api/aptitude/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.write(JSON.stringify({ category, difficulty: 'Mixed', count }));
    req.end();
  });
}

async function run() {
  const loginData = await new Promise(res => {
    const r = http.request('http://localhost:3001/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, r2 => { let d=''; r2.on('data', c=>d+=c); r2.on('end', ()=>res(JSON.parse(d))); });
    r.write(JSON.stringify({ email: 'test_1234567@example.com', password: 'password123' })); r.end();
  });

  const categories = [
    'Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability', 'Basic Coding',
    'Data Structures & Algorithms', 'Operating Systems', 'Computer Networks', 'DBMS',
    'DCN', 'Theory of Computation', 'OOPS', 'C++'
  ];

  console.log('--- STARTING CATEGORY TESTS (count=1) ---');
  for (const cat of categories) {
    try {
      const result = await testCategory(loginData.token, cat, 1);
      if (result.status === 200 && result.data.questions && result.data.questions.length > 0) {
        const q = result.data.questions[0];
        console.log('[SUCCESS] ' + cat + ' | QCat: ' + q.category + ' | Opts: ' + q.options.length + ' | Ans: ' + (q.correct_answer !== undefined));
      } else {
        console.log('[FAIL] ' + cat + ' | Status: ' + result.status + ' | Err: ', result.data.error || result.data);
      }
    } catch(e) {
      console.log('[ERROR] ' + cat + ' | Err: ' + e.message);
    }
  }

  console.log('\n--- 10-QUESTION TEST (Quantitative Aptitude) ---');
  const res10 = await testCategory(loginData.token, 'Quantitative Aptitude', 10);
  console.log('Status: ' + res10.status + ' | Total Qs: ' + res10.data.totalQuestions + ' | QArrLen: ' + (res10.data.questions ? res10.data.questions.length : 0));

  console.log('\n--- 5-QUESTION TEST (DBMS) ---');
  const res5 = await testCategory(loginData.token, 'DBMS', 5);
  console.log('Status: ' + res5.status + ' | Total Qs: ' + res5.data.totalQuestions + ' | QArrLen: ' + (res5.data.questions ? res5.data.questions.length : 0));
}
run();
