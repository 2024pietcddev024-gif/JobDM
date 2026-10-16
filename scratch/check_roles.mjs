import db from '../server/db.js';

async function main() {
  const usersRes = await db.query('SELECT id, email FROM users');
  const campusRes = await db.query('SELECT user_id, college_id, system_role, status FROM campus_users');
  
  const superAdmins = campusRes.rows.filter(r => r.system_role === 'SUPER_ADMIN').length;
  const collegeAdmins = campusRes.rows.filter(r => r.system_role === 'COLLEGE_ADMIN').length;
  const tutors = campusRes.rows.filter(r => r.system_role === 'TUTOR').length;
  const students = campusRes.rows.filter(r => r.system_role === 'STUDENT').length;
  
  console.log('--- USERS ---');
  usersRes.rows.forEach(u => console.log(`${u.id}: (${u.email})`));
  
  console.log('--- CAMPUS USERS ---');
  campusRes.rows.forEach(c => console.log(`User: ${c.user_id}, Role: ${c.system_role}, Status: ${c.status}`));
  
  console.log('--- SUMMARY ---');
  console.log('SUPER_ADMIN:', superAdmins);
  console.log('COLLEGE_ADMIN:', collegeAdmins);
  console.log('TUTOR:', tutors);
  console.log('STUDENT:', students);
  
  process.exit(0);
}
main();
