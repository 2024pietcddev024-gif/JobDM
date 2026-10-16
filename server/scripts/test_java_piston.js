const code = `public class Main { public static void main(String[] args) { System.out.println("hello from java"); } }`;
fetch('http://localhost:2000/api/v2/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ language: 'java', version: '15.0.2', files: [{ content: code }] })
}).then(r => r.json()).then(data => {
  console.log('Java test result:');
  console.log('  stdout:', JSON.stringify(data.run?.stdout?.trim()));
  console.log('  stderr:', JSON.stringify(data.run?.stderr?.slice(0, 100)));
  console.log('  status:', data.run?.status);
  console.log('  code:', data.run?.code);
  console.log('  message:', data.run?.message);
}).catch(e => console.error('ERROR:', e.message));
