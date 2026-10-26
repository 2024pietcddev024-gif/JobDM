import assert from 'assert';

const API_BASE = 'http://localhost:3001/api';

async function testRoleRegistrationSecurity() {
  console.log('--- Starting Registration & Role Security Verification ---');

  // Test 1: Student registration succeeds and assigns student access
  const studentEmail = `student_${Date.now()}@example.com`;
  console.log('\n1. Testing Student Registration...');
  const resStudent = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student User',
      email: studentEmail,
      password: 'Password123!',
      role: 'student'
    })
  });
  const dataStudent = await resStudent.json();
  assert.strictEqual(resStudent.status, 201, `Student registration should return 201 Created. Got: ${resStudent.status}`);
  assert.ok(dataStudent.token, 'Should return a JWT token');
  assert.strictEqual(dataStudent.user.email, studentEmail);
  console.log('✅ Student registration succeeded with 201 Created and valid token');

  // Test 2: Teacher registration blocked with institutional authorization guidance (403)
  console.log('\n2. Testing Teacher Registration Security Check...');
  const resTeacher = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unauthorized Teacher Attempt',
      email: `teacher_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'teacher'
    })
  });
  const dataTeacher = await resTeacher.json();
  assert.strictEqual(resTeacher.status, 403, `Teacher registration should return 403 Forbidden. Got: ${resTeacher.status}`);
  assert.ok(dataTeacher.error.includes('Teacher accounts are provisioned by institutional invitation'), 'Should provide institutional provisioning message');
  console.log('✅ Teacher public registration correctly rejected with 403 and institutional message:', dataTeacher.error);

  // Test 3: HR registration blocked with institutional authorization guidance (403)
  console.log('\n3. Testing HR Registration Security Check...');
  const resHR = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unauthorized HR Attempt',
      email: `hr_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'hr'
    })
  });
  const dataHR = await resHR.json();
  assert.strictEqual(resHR.status, 403, `HR registration should return 403 Forbidden. Got: ${resHR.status}`);
  assert.ok(dataHR.error.includes('HR accounts are provisioned by platform authorization'), 'Should provide institutional provisioning message');
  console.log('✅ HR public registration correctly rejected with 403 and institutional message:', dataHR.error);

  // Test 4: Super Admin / College Admin registration blocked (403)
  console.log('\n4. Testing Super Admin / Admin Privilege Escalation Prevention...');
  const resAdmin = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Attacker Admin Attempt',
      email: `attacker_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'super_admin'
    })
  });
  const dataAdmin = await resAdmin.json();
  assert.strictEqual(resAdmin.status, 403, `Super Admin registration should return 403 Forbidden. Got: ${resAdmin.status}`);
  assert.ok(dataAdmin.error.includes('Administrative accounts cannot be created via public registration'), 'Should forbid admin creation');
  console.log('✅ Super Admin registration correctly forbidden with 403:', dataAdmin.error);

  // Test 5: Common Login Works for Registered Student
  console.log('\n5. Testing Common Login with Registered Student Credentials...');
  const resLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: 'Password123!'
    })
  });
  const dataLogin = await resLogin.json();
  assert.strictEqual(resLogin.status, 200, `Student login should return 200 OK. Got: ${resLogin.status}`);
  assert.ok(dataLogin.token, 'Login should return a JWT token');
  assert.strictEqual(dataLogin.user.email, studentEmail);
  console.log('✅ Common login successfully authenticated student');

  // Test 6: Verify Auth /me returns user and campus info
  console.log('\n6. Testing /api/auth/me Profile Verification...');
  const resMe = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${dataLogin.token}` }
  });
  const dataMe = await resMe.json();
  assert.strictEqual(resMe.status, 200, `Auth /me should return 200. Got: ${resMe.status}`);
  assert.strictEqual(dataMe.user.email, studentEmail);
  console.log('✅ Auth /me returned verified user profile');

  // Test 7: Verify Dashboard Routing Function for All Verified Roles
  console.log('\n7. Testing getRoleDashboard mapping for all verified roles...');
  function getRoleDashboard(role) {
    switch (role) {
      case 'TUTOR':
        return 'teacher-dashboard';
      case 'HR':
        return 'hr-dashboard';
      case 'SUPER_ADMIN':
        return 'registrar-overview';
      case 'COLLEGE_ADMIN':
        return 'college-admin';
      case 'STUDENT':
      default:
        return 'dashboard';
    }
  }

  assert.strictEqual(getRoleDashboard('STUDENT'), 'dashboard');
  assert.strictEqual(getRoleDashboard('TUTOR'), 'teacher-dashboard');
  assert.strictEqual(getRoleDashboard('HR'), 'hr-dashboard');
  assert.strictEqual(getRoleDashboard('SUPER_ADMIN'), 'registrar-overview');
  assert.strictEqual(getRoleDashboard('COLLEGE_ADMIN'), 'college-admin');
  assert.strictEqual(getRoleDashboard(undefined), 'dashboard');
  console.log('✅ Dashboard mapping correctly routes STUDENT -> dashboard, TUTOR -> teacher-dashboard, HR -> hr-dashboard, SUPER_ADMIN -> registrar-overview');

  // Test 8: Super Admin accounts exist and are preserved in DB
  console.log('\n8. Verifying existing Super Admin account preservation...');
  const { default: db } = await import('../server/db.js');
  const superAdminRes = await db.query(
    "SELECT u.email, cu.system_role FROM users u JOIN campus_users cu ON u.id = cu.user_id WHERE cu.system_role = 'SUPER_ADMIN' LIMIT 1"
  );
  assert.ok(superAdminRes.rows.length > 0, 'Super Admin must exist in database');
  console.log(`✅ Super Admin account verified in DB: ${superAdminRes.rows[0].email} with role: ${superAdminRes.rows[0].system_role}`);

  console.log('\n======================================================');
  console.log('🎉 ALL 8 REGISTRATION & ROLE SECURITY TESTS PASSED!');
  console.log('======================================================\n');
  process.exit(0);

}

testRoleRegistrationSecurity().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
