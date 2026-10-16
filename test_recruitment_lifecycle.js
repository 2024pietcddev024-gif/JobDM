// test_recruitment_lifecycle.js
const API_BASE = 'http://127.0.0.1:3001/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runLifecycle() {
  console.log('==================================================');
  console.log('CROSS-ROLE RECRUITMENT LIFECYCLE E2E TEST');
  console.log('==================================================\n');

  // 1. Student Login (Priya Patel: priya@gmail.com)
  const studentAuth = await request('/auth/login', {
    method: 'POST',
    body: { email: 'priya@gmail.com', password: 'password123' }
  });
  if (!studentAuth.ok) throw new Error('Student login failed');
  const studentToken = studentAuth.data.token;
  console.log('✅ 1. Student Priya Patel authenticated');

  // 2. Student browses jobs and finds an open job
  const jobsRes = await request('/campus/jobs', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (!jobsRes.ok || jobsRes.data.length === 0) throw new Error('No open jobs found');
  const targetJob = jobsRes.data[0];
  console.log(`✅ 2. Student found open job: "${targetJob.title}" (ID: ${targetJob.id})`);

  // 3. Student applies to job
  const applyRes = await request(`/campus/jobs/${targetJob.id}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { notes: 'Excited to apply for this campus opportunity!' }
  });
  console.log('Apply response status:', applyRes.status, 'message:', applyRes.data?.message || applyRes.data?.error);
  const applicationId = applyRes.data?.application?.id || applyRes.data?.id;

  // 4. Student checks applications
  const myApps = await request('/campus/applications/my', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const currentApp = myApps.data.find(a => a.job_id === targetJob.id);
  console.log(`✅ 3. Student application submitted. Status is: "${currentApp?.status}"`);

  // 5. HR Login (Dev Sharma)
  const hrAuth = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'HR-piet24cd-NUEN0K',
      password: 'password123',
      college_code: 'piet24cd',
      panel: 'HR'
    }
  });
  if (!hrAuth.ok) throw new Error('HR login failed');
  const hrToken = hrAuth.data.token;
  console.log('✅ 4. HR Dev Sharma authenticated');

  // 6. HR reviews candidate pipeline and transitions status to SHORTLISTED
  const updateStatusRes = await request(`/campus/hr/applications/${currentApp.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: { status: 'SHORTLISTED' }
  });
  if (!updateStatusRes.ok) throw new Error('HR failed to update status');
  console.log(`✅ 5. HR shortlisted candidate Priya Patel (Status: ${updateStatusRes.data.status})`);

  // 7. HR schedules recruitment interview
  const scheduleTime = new Date(Date.now() + 2 * 86400000).toISOString();
  const scheduleRes = await request('/campus/hr/interviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: {
      application_id: currentApp.id,
      schedule_time: scheduleTime,
      type: 'Technical',
      stage: 'Technical Round 1'
    }
  });
  if (!scheduleRes.ok) throw new Error('HR failed to schedule interview');
  console.log(`✅ 6. HR scheduled interview for: ${scheduleTime} (Type: Technical)`);

  // 8. Student verifies updated status in Student Portal
  const studentVerify = await request('/campus/applications/my', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const updatedApp = studentVerify.data.find(a => a.id === currentApp.id);
  console.log(`✅ 7. Student portal reflection verified: Status is now "${updatedApp?.status}"`);

  if (updatedApp?.status === 'INTERVIEW_SCHEDULED') {
    console.log('\n==================================================');
    console.log('🎉 LIFECYCLE TEST PASSED: Full cross-role flow verified!');
    console.log('==================================================');
  } else {
    throw new Error(`Expected INTERVIEW_SCHEDULED, got ${updatedApp?.status}`);
  }
}

runLifecycle().catch(err => {
  console.error('Lifecycle test error:', err);
  process.exit(1);
});
