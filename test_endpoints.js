async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/campus/hr/overview');
    console.log('Status without token:', res.status);
    const body = await res.json().catch(() => null);
    console.log('Body:', body);

    const res2 = await fetch('http://localhost:3001/api/campus/hr/overview', {
      headers: { 'Authorization': 'Bearer fake_token' }
    });
    console.log('Status with fake token:', res2.status);
    
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}
test();
