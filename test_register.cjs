const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(`Status: ${res.statusCode}\nBody: ${body}`));
});
req.write(JSON.stringify({name: 'Test User', email: 'testuser3@example.com', password: 'password123'}));
req.end();
