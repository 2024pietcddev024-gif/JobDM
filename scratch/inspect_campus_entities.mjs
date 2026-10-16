import db from '../server/db.js';

async function main() {
  const colleges = await db.query('SELECT * FROM colleges');
  const departments = await db.query('SELECT * FROM departments');
  const batches = await db.query('SELECT * FROM batches');
  const batchTutors = await db.query('SELECT * FROM batch_tutors');
  const studentEnrollments = await db.query('SELECT * FROM student_enrollments');
  const hrJobs = await db.query('SELECT * FROM hr_jobs');
  const hrApps = await db.query('SELECT * FROM hr_applications');
  const hrInterviews = await db.query('SELECT * FROM hr_interviews');

  const campusUsers = await db.query(`
    SELECT cu.*, u.email, u.full_name, c.name as college_name, c.code as college_code 
    FROM campus_users cu 
    JOIN users u ON cu.user_id = u.id 
    LEFT JOIN colleges c ON cu.college_id = c.id
  `);

  console.log({
    campusUsers: campusUsers.rows,
    colleges: colleges.rows,
    departments: departments.rows,
    batches: batches.rows,
    batchTutors: batchTutors.rows,
    studentEnrollments: studentEnrollments.rows,
    hrJobs: hrJobs.rows,
    hrApps: hrApps.rows,
    hrInterviews: hrInterviews.rows
  });

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
