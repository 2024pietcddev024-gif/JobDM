const run = async () => {
  const res = await fetch('http://localhost:2000/api/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'python',
      version: '3.10.0',
      files: [{ name: 'main.py', content: 'print("Python works")' }]
    })
  });
  const text = await res.text();
  console.log(res.status, text);
};
run();
