const testBadAuth = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/code/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer badtoken123'
      },
      body: JSON.stringify({
        language: 'Python',
        code: 'print("Testing bad auth")',
        testCases: [{ input: '', expectedOutput: 'Testing bad auth' }],
        problemTitle: 'Test'
      })
    });
    console.log('Live Backend Status (Bad Token):', res.status);
  } catch (err) {
    console.error('Error hitting live backend:', err.message);
  }
};
testBadAuth();
