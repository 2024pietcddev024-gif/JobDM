import app from './server/server.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './server/config/jwt.js';

const testAuth = async () => {
  const PORT = 3005;
  const server = app.listen(PORT, async () => {
    try {
      console.log('Testing guest access...');
      const guestRes = await fetch(`http://localhost:${PORT}/api/code/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer null'
        },
        body: JSON.stringify({
          language: 'Python',
          code: 'print("Guest works")',
          testCases: [{ input: '', expectedOutput: 'Guest works' }],
          problemTitle: 'Test'
        })
      });
      console.log('Guest Res Status:', guestRes.status);
      const guestData = await guestRes.json();
      console.log('Guest Res Data:', guestData.status, guestData.passedCount);

      console.log('Testing logged in access...');
      const validToken = jwt.sign({ id: 1, email: 'test@test.com' }, getJwtSecret());
      const authRes = await fetch(`http://localhost:${PORT}/api/code/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          language: 'Python',
          code: 'print("Auth works")',
          testCases: [{ input: '', expectedOutput: 'Auth works' }],
          problemTitle: 'Test'
        })
      });
      console.log('Auth Res Status:', authRes.status);
      const authData = await authRes.json();
      console.log('Auth Res Data:', authData.status, authData.passedCount);

      console.log('Testing expired token access...');
      const badToken = 'invalid.token.here';
      const badRes = await fetch(`http://localhost:${PORT}/api/code/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${badToken}`
        },
        body: JSON.stringify({
          language: 'Python',
          code: 'print("Bad auth works")',
          testCases: [{ input: '', expectedOutput: 'Bad auth works' }],
          problemTitle: 'Test'
        })
      });
      console.log('Bad Auth Res Status:', badRes.status);

    } catch(e) {
      console.error(e);
    } finally {
      server.close();
      process.exit(0);
    }
  });
};

testAuth();
