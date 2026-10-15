// verify hr
const PORT = 3001;
const API = `http://localhost:${PORT}/api`;

async function verify() {
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'HR-piet24cd-NUEN0K', password: 'wwmrsxyskhwde1vnw6nb', college_code: 'piet24cd', panel: 'hr' })
  });
  
  if (res.status !== 200) {
    console.error('HR Login failed:', res.status, await res.text());
    process.exit(1);
  }
  const token = (await res.json()).token;

  res = await fetch(`${API}/campus/hr/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (res.status === 200) {
    console.log('Profile Access SUCCESS:', await res.json());
    process.exit(0);
  } else {
    console.error('Profile Access failed:', res.status);
    process.exit(1);
  }
}
verify();
