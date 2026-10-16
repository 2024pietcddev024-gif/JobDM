const testLiveBackend = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/code/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({
        language: 'Python',
        code: 'print("Testing live backend")',
        testCases: [{ input: '', expectedOutput: 'Testing live backend' }],
        problemTitle: 'Test'
      })
    });
    const text = await res.text();
    console.log('Live Backend Status:', res.status);
    console.log('Live Backend Response:', text);
  } catch (err) {
    console.error('Error hitting live backend:', err.message);
  }
};
testLiveBackend();
