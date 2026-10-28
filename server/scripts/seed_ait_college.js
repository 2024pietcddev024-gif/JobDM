import { query } from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  console.log('🚀 Starting AIT Jaipur College Seeding...');

  // Dynamically resolve bcrypt
  const bcryptMod = await import('../node_modules/bcrypt/bcrypt.js').catch(async () => {
    return await import('bcrypt');
  });
  const bcrypt = bcryptMod.default || bcryptMod;

  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const teacherPasswordHash = await bcrypt.hash('Teacher@123', 10);
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);

  // 1. Create or update College
  const collegeCode = 'AIT-JAIPUR';
  const collegeName = 'Arya Institute of Technology (AIT)';
  const collegeDomain = 'aitjaipur.edu';

  let colRes = await query('SELECT id FROM colleges WHERE LOWER(code) = LOWER($1)', [collegeCode]);
  let collegeId;

  if (colRes.rows.length > 0) {
    collegeId = colRes.rows[0].id;
    await query(
      `UPDATE colleges 
       SET name = $1, domain = $2, official_email_domain = $2, status = 'ACTIVE', verified_at = NOW(), contact_email = 'admin@aitjaipur.edu'
       WHERE id = $3`,
      [collegeName, collegeDomain, collegeId]
    );
    console.log(`✅ Updated College: ${collegeName} (${collegeId})`);
  } else {
    const newCol = await query(
      `INSERT INTO colleges (name, code, domain, official_email_domain, status, verified_at, verification_notes, contact_email, contact_phone)
       VALUES ($1, $2, $3, $3, 'ACTIVE', NOW(), 'Verified Institutional Seeding', 'admin@aitjaipur.edu', '+91 98765 43210')
       RETURNING id`,
      [collegeName, collegeCode, collegeDomain]
    );
    collegeId = newCol.rows[0].id;
    console.log(`✅ Created College: ${collegeName} (${collegeId})`);
  }

  // 2. Create Departments
  const departmentsData = [
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'Artificial Intelligence & Data Science', code: 'AIDS' }
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    let deptRes = await query(
      'SELECT id FROM departments WHERE college_id = $1 AND LOWER(code) = LOWER($2)',
      [collegeId, d.code]
    );
    if (deptRes.rows.length > 0) {
      deptMap[d.code] = deptRes.rows[0].id;
    } else {
      const newD = await query(
        'INSERT INTO departments (college_id, name, code) VALUES ($1, $2, $3) RETURNING id',
        [collegeId, d.name, d.code]
      );
      deptMap[d.code] = newD.rows[0].id;
    }
    console.log(`✅ Department ready: ${d.name} (${d.code})`);
  }

  // 3. Create Batches
  const batchesData = [
    { name: 'Batch 2026 CSE-A', deptCode: 'CSE', academicYear: '2025-2026' },
    { name: 'Batch 2026 AI-A', deptCode: 'AIDS', academicYear: '2025-2026' }
  ];

  const batchMap = {};
  for (const b of batchesData) {
    const deptId = deptMap[b.deptCode];
    let batchRes = await query(
      'SELECT id FROM batches WHERE college_id = $1 AND department_id = $2 AND LOWER(name) = LOWER($3)',
      [collegeId, deptId, b.name]
    );
    if (batchRes.rows.length > 0) {
      batchMap[b.name] = batchRes.rows[0].id;
    } else {
      const newB = await query(
        'INSERT INTO batches (college_id, department_id, name, academic_year, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [collegeId, deptId, b.name, b.academicYear, 'ACTIVE']
      );
      batchMap[b.name] = newB.rows[0].id;
    }
    console.log(`✅ Batch ready: ${b.name}`);
  }

  // Helper function to upsert user and campus_users
  async function upsertUser({ email, fullName, passwordHash, role, systemRole, rollNumber, deptCode, targetRole }) {
    let userRes = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    let userId;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      await query(
        `UPDATE users 
         SET full_name = $1, password_hash = $2, college_email = $3, college_email_verified = TRUE,
             target_role = COALESCE($4, target_role), target_level = 'Intermediate',
             must_change_password = FALSE, account_lifecycle_status = 'ACTIVE_STUDENT'
         WHERE id = $5`,
        [fullName, passwordHash, email, targetRole || 'Software Engineer', userId]
      );
    } else {
      const newU = await query(
        `INSERT INTO users (
           email, password_hash, full_name, college_email, college_email_verified, 
           college_email_verified_at, personal_email, personal_email_verified,
           primary_contact_preference, account_lifecycle_status, target_role, target_level,
           streak_days, must_change_password
         ) VALUES (
           $1, $2, $3, $1, TRUE, NOW(), $1, TRUE, 'COLLEGE', 'ACTIVE_STUDENT', $4, 'Intermediate', 3, FALSE
         ) RETURNING id`,
        [email, passwordHash, fullName, targetRole || 'Software Engineer']
      );
      userId = newU.rows[0].id;
    }

    // Upsert campus_users
    const deptId = deptCode ? deptMap[deptCode] : null;
    let cuRes = await query('SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2', [userId, collegeId]);

    if (cuRes.rows.length > 0) {
      await query(
        `UPDATE campus_users 
         SET system_role = $1, status = 'ACTIVE', institutional_email = $2, roll_number = $3, department_id = $4, updated_at = NOW()
         WHERE id = $5`,
        [systemRole, email, rollNumber || null, deptId, cuRes.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO campus_users (user_id, college_id, system_role, status, institutional_email, roll_number, department_id, verified_at)
         VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6, NOW())`,
        [userId, collegeId, systemRole, email, rollNumber || null, deptId]
      );
    }

    return userId;
  }

  // 4. Provision College Admin
  const adminId = await upsertUser({
    email: 'admin@aitjaipur.edu',
    fullName: 'Dr. Rajesh Gupta (Dean)',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    systemRole: 'COLLEGE_ADMIN',
    rollNumber: null,
    deptCode: 'CSE',
    targetRole: 'Academic Administrator'
  });
  console.log('✅ College Admin Provisioned: admin@aitjaipur.edu');

  // 5. Provision 2 Faculty Members
  const facultyList = [
    {
      email: 'vikram.sharma@aitjaipur.edu',
      fullName: 'Dr. Vikram Sharma (HOD CSE)',
      deptCode: 'CSE',
      batchName: 'Batch 2026 CSE-A'
    },
    {
      email: 'neha.verma@aitjaipur.edu',
      fullName: 'Prof. Neha Verma (Faculty AI)',
      deptCode: 'AIDS',
      batchName: 'Batch 2026 AI-A'
    }
  ];

  for (const fac of facultyList) {
    const facUserId = await upsertUser({
      email: fac.email,
      fullName: fac.fullName,
      passwordHash: teacherPasswordHash,
      role: 'TEACHER',
      systemRole: 'TUTOR',
      deptCode: fac.deptCode,
      targetRole: 'Senior Professor'
    });

    const bId = batchMap[fac.batchName];
    if (bId) {
      const btCheck = await query('SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2', [bId, facUserId]);
      if (btCheck.rows.length === 0) {
        await query('INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)', [bId, facUserId]);
      }
    }
    console.log(`✅ Faculty Provisioned & Assigned: ${fac.fullName} (${fac.email}) -> ${fac.batchName}`);
  }

  // 6. Provision 10 Students
  const studentsList = [
    // CSE Batch
    { name: 'Aarav Sharma', email: 'aarav.sharma@aitjaipur.edu', roll: 'AIT26CS001', dept: 'CSE', batch: 'Batch 2026 CSE-A', target: 'Full Stack Developer', mockScore: 88 },
    { name: 'Diya Patel', email: 'diya.patel@aitjaipur.edu', roll: 'AIT26CS002', dept: 'CSE', batch: 'Batch 2026 CSE-A', target: 'Frontend Developer', mockScore: 92 },
    { name: 'Rohan Verma', email: 'rohan.verma@aitjaipur.edu', roll: 'AIT26CS003', dept: 'CSE', batch: 'Batch 2026 CSE-A', target: 'Backend Developer', mockScore: 81 },
    { name: 'Ananya Mishra', email: 'ananya.mishra@aitjaipur.edu', roll: 'AIT26CS004', dept: 'CSE', batch: 'Batch 2026 CSE-A', target: 'Software Engineer', mockScore: 78 },
    { name: 'Kabir Mehta', email: 'kabir.mehta@aitjaipur.edu', roll: 'AIT26CS005', dept: 'CSE', batch: 'Batch 2026 CSE-A', target: 'DevOps Engineer', mockScore: 85 },
    // AIDS Batch
    { name: 'Ishita Singhal', email: 'ishita.singhal@aitjaipur.edu', roll: 'AIT26AI001', dept: 'AIDS', batch: 'Batch 2026 AI-A', target: 'AI/ML Engineer', mockScore: 95 },
    { name: 'Manav Joshi', email: 'manav.joshi@aitjaipur.edu', roll: 'AIT26AI002', dept: 'AIDS', batch: 'Batch 2026 AI-A', target: 'Data Scientist', mockScore: 87 },
    { name: 'Rhea Nair', email: 'rhea.nair@aitjaipur.edu', roll: 'AIT26AI003', dept: 'AIDS', batch: 'Batch 2026 AI-A', target: 'Data Analyst', mockScore: 83 },
    { name: 'Aditya Choudhary', email: 'aditya.choudhary@aitjaipur.edu', roll: 'AIT26AI004', dept: 'AIDS', batch: 'Batch 2026 AI-A', target: 'Cloud Engineer', mockScore: 76 },
    { name: 'Tanvi Deshmukh', email: 'tanvi.deshmukh@aitjaipur.edu', roll: 'AIT26AI005', dept: 'AIDS', batch: 'Batch 2026 AI-A', target: 'Mobile App Developer', mockScore: 90 }
  ];

  for (const st of studentsList) {
    const studentUserId = await upsertUser({
      email: st.email,
      fullName: st.name,
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      systemRole: 'STUDENT',
      rollNumber: st.roll,
      deptCode: st.dept,
      targetRole: st.target
    });

    const bId = batchMap[st.batch];
    if (bId) {
      const seCheck = await query('SELECT id FROM student_enrollments WHERE batch_id = $1 AND student_user_id = $2', [bId, studentUserId]);
      if (seCheck.rows.length === 0) {
        await query('INSERT INTO student_enrollments (batch_id, student_user_id, status) VALUES ($1, $2, $3)', [bId, studentUserId, 'ACTIVE']);
      }
    }

    // Seed a mock interview session for realistic teacher dashboard analytics
    const sessionCheck = await query('SELECT id FROM interview_sessions WHERE user_id = $1 LIMIT 1', [studentUserId]);
    if (sessionCheck.rows.length === 0) {
      await query(
        `INSERT INTO interview_sessions (
           user_id, category, role, difficulty, mode, overall_score, duration_minutes,
           summary, status, completed_at, total_questions, answered_questions, college_id
         ) VALUES (
           $1, 'TECHNICAL', $2, 'Medium', 'AI_VOICE', $3, 24,
           'Strong analytical problem-solving and structured communication.', 'COMPLETED', NOW() - INTERVAL '1 day', 5, 5, $4
         )`,
        [studentUserId, st.target, st.mockScore, collegeId]
      );
    }

    console.log(`✅ Student Provisioned & Enrolled: ${st.name} (${st.email}) -> ${st.batch}`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 10 STUDENTS & 2 FACULTY SUCCESSFULLY SEEDED! 🎉');
  console.log('======================================================\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
