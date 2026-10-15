const http = require('http');

const request = (path, method, body) => new Promise((resolve, reject) => {
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/auth/${path}`,
    method,
    headers: { 'Content-Type': 'application/json' }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

async function runTests() {
  const ts = Date.now();
  const email = `test_${ts}@example.com`;
  
  console.log('1. New user signup');
  let res = await request('register', 'POST', { name: 'Test User', email, password: 'password123' });
  console.log('Status:', res.status, res.body.includes('token') ? 'OK' : 'FAIL');

  console.log('2. Duplicate email signup');
  res = await request('register', 'POST', { name: 'Test User', email, password: 'password123' });
  console.log('Status:', res.status, res.body.includes('already exists') ? 'OK' : 'FAIL');

  console.log('3. Invalid email (backend currently does not validate format, so it might pass or fail DB constraint if any)');
  res = await request('register', 'POST', { name: 'Test User', email: 'not-an-email', password: 'password123' });
  console.log('Status:', res.status);

  console.log('4. Missing required fields');
  res = await request('register', 'POST', { name: 'Test User' });
  console.log('Status:', res.status, res.body.includes('required') ? 'OK' : 'FAIL');

  console.log('5. Weak/invalid password (backend currently accepts any non-empty string)');
  res = await request('register', 'POST', { name: 'Test User', email: `test_${ts}_2@example.com`, password: '1' });
  console.log('Status:', res.status);

  console.log('7. Login using a successfully registered account');
  res = await request('login', 'POST', { email, password: 'password123' });
  console.log('Status:', res.status, res.body.includes('token') ? 'OK' : 'FAIL');

  console.log('8. Existing user login and authentication regression');
  res = await request('login', 'POST', { email: 'testuser3@example.com', password: 'password123' });
  console.log('Status:', res.status, res.body.includes('token') ? 'OK' : 'FAIL');
}
runTests();
