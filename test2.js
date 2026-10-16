const run = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/code/run', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Deliberately not sending token or sending a bad token to see the response
        'Authorization': 'Bearer test' 
      },
      body: JSON.stringify({
        language: 'Python',
        code: 'print("Python works")',
        testCases: [{ input: '', expectedOutput: 'Python works' }],
        problemTitle: 'Test'
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch(e) {
    console.error(e);
  }
};
run();
