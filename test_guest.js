const run = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/code/run', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null' 
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
