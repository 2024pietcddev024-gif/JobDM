// test_full_platform_e2e.js
import http from 'http';

const API_BASE = 'http://127.0.0.1:3001/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    console.error(`Fetch exception for ${url}:`, err.message);
    return { status: 500, ok: false, data: null, error: err.message };
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('JOBDM FULL-STACK MULTI-ROLE INTEGRATION TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. TEACHER AUTH & WORKFLOW
  // -------------------------------------------------------------------------
  console.log('--- Phase 1: Teacher Panel Full-Stack Testing ---');
  const teacherLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'teacher.test1@jobdm.edu', password: 'password123', college_code: 'piet24cd', panel: 'TUTOR' }
  });
  console.log('teacherLogin status:', teacherLogin.status, 'data:', teacherLogin.data);
  assert(teacherLogin.ok && teacherLogin.data?.token, 'Teacher successfully logged in');
  const teacherToken = teacherLogin.data?.token;

  // Tutor Profile & Campus context
  const tutorMe = await request('/campus/tutor/me', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  console.log('tutorMe status:', tutorMe.status, 'data:', tutorMe.data);
  assert(tutorMe.ok && tutorMe.data?.email === 'teacher.test1@jobdm.edu', 'GET /campus/tutor/me returned verified tutor profile');

  // Tutor Batches
  const tutorBatches = await request('/campus/tutor/batches', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  console.log('tutorBatches status:', tutorBatches.status, 'data count:', tutorBatches.data?.length);
  assert(tutorBatches.ok && Array.isArray(tutorBatches.data), `GET /campus/tutor/batches returned ${tutorBatches.data?.length} batches`);

  // Tutor Students
  const tutorStudents = await request('/campus/tutor/students', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  console.log('tutorStudents status:', tutorStudents.status, 'data count:', tutorStudents.data?.length);
  assert(tutorStudents.ok && Array.isArray(tutorStudents.data), `GET /campus/tutor/students returned ${tutorStudents.data?.length} students`);

  // Tutor Analytics Overview
  const tutorOverview = await request('/campus/tutor/analytics/overview', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  console.log('tutorOverview status:', tutorOverview.status, 'data:', tutorOverview.data);
  assert(tutorOverview.ok && typeof tutorOverview.data?.assignedBatches === 'number', 'GET /campus/tutor/analytics/overview returned valid KPI metrics');

  // Tutor Trends
  const tutorTrends = await request('/campus/tutor/analytics/trends', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  assert(tutorTrends.ok && Array.isArray(tutorTrends.data?.interviewTrends), 'GET /campus/tutor/analytics/trends returned timeline trend points');

  // -------------------------------------------------------------------------
  // 2. HR AUTH & RECRUITMENT WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 2: HR Panel Full-Stack Testing ---');
  const hrLogin = await request('/auth/login', {
    method: 'POST',
    body: { 
      email: 'HR-piet24cd-NUEN0K', 
      password: 'password123', 
      college_code: 'piet24cd',
      panel: 'HR' 
    }
  });
  assert(hrLogin.ok && hrLogin.data?.token, 'HR logged in using HR ID & College Code');
  const hrToken = hrLogin.data?.token;

  // HR Profile
  const hrProfile = await request('/campus/hr/profile', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(hrProfile.ok && hrProfile.data?.role === 'HR' && hrProfile.data?.college_code === 'piet24cd', 'GET /campus/hr/profile returned verified organization details');

  // HR Overview
  const hrOverview = await request('/campus/hr/overview', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(hrOverview.ok && typeof hrOverview.data?.totalJobs === 'number', `GET /campus/hr/overview returned totalJobs: ${hrOverview.data?.totalJobs}, totalApplications: ${hrOverview.data?.totalApplications}`);

  // HR Jobs List
  const hrJobs = await request('/campus/hr/jobs', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(hrJobs.ok && Array.isArray(hrJobs.data), `GET /campus/hr/jobs returned ${hrJobs.data?.length} active job listings`);

  // HR Candidates Pipeline
  const hrCandidates = await request('/campus/hr/candidates', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(hrCandidates.ok && Array.isArray(hrCandidates.data), `GET /campus/hr/candidates returned ${hrCandidates.data?.length} applicant records`);

  // HR Analytics
  const hrAnalytics = await request('/campus/hr/analytics', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(hrAnalytics.ok && Array.isArray(hrAnalytics.data?.applicationsTrend), 'GET /campus/hr/analytics returned application trends and role distributions');

  // HR Interviews
  const hrInterviews = await request('/campus/hr/interviews', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  assert(hrInterviews.ok && Array.isArray(hrInterviews.data), `GET /campus/hr/interviews returned ${hrInterviews.data?.length} interview sessions`);

  // -------------------------------------------------------------------------
  // 3. STUDENT RECRUITMENT WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 3: Student Campus Recruitment Integration ---');
  // Student Login (Arjun Sharma)
  const studentLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'arjun@gmail.com', password: 'password123' }
  });
  assert(studentLogin.ok && studentLogin.data?.token, 'Student logged in successfully');
  const studentToken = studentLogin.data?.token;

  // Student browse campus jobs
  const studentJobs = await request('/campus/jobs', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentJobs.ok && Array.isArray(studentJobs.data), `GET /campus/jobs returned ${studentJobs.data?.length} positions open to student's college`);

  // Student check my applications
  const studentApps = await request('/campus/applications/my', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentApps.ok && Array.isArray(studentApps.data), `GET /campus/applications/my returned ${studentApps.data?.length} submitted applications`);

  // -------------------------------------------------------------------------
  // 4. CROSS-ROLE SECURITY & RBAC ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 4: Cross-Role RBAC Security Enforcement ---');
  // Student attempting HR endpoint
  const studentAccessHr = await request('/campus/hr/overview', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentAccessHr.status === 403, 'Security: Student access to /campus/hr/overview blocked with 403 Forbidden');

  // Student attempting Tutor endpoint
  const studentAccessTutor = await request('/campus/tutor/batches', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentAccessTutor.status === 403, 'Security: Student access to /campus/tutor/batches blocked with 403 Forbidden');

  // Teacher attempting HR endpoint
  const teacherAccessHr = await request('/campus/hr/jobs', {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  assert(teacherAccessHr.status === 403, 'Security: Teacher access to /campus/hr/jobs blocked with 403 Forbidden');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
