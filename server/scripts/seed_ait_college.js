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

    const altEmail = email.replace('@aitjaipur.edu', '@aijaipur.edu');

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      await query(
        `UPDATE users 
         SET full_name = $1, password_hash = $2, college_email = $3, college_email_verified = TRUE,
             personal_email = $4, personal_email_verified = TRUE,
             target_role = COALESCE($5, target_role), target_level = 'Intermediate',
             must_change_password = FALSE, account_lifecycle_status = 'ACTIVE_STUDENT'
         WHERE id = $6`,
        [fullName, passwordHash, email, altEmail, targetRole || 'Software Engineer', userId]
      );
    } else {
      const newU = await query(
        `INSERT INTO users (
           email, password_hash, full_name, college_email, college_email_verified, 
           college_email_verified_at, personal_email, personal_email_verified,
           primary_contact_preference, account_lifecycle_status, target_role, target_level,
           streak_days, must_change_password
         ) VALUES (
           $1, $2, $3, $1, TRUE, NOW(), $4, TRUE, 'COLLEGE', 'ACTIVE_STUDENT', $5, 'Intermediate', 3, FALSE
         ) RETURNING id`,
        [email, passwordHash, fullName, altEmail, targetRole || 'Software Engineer']
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

  // 7. Seed Partner Companies and Campus Placement Drives
  console.log('\n🏢 Seeding Partner Companies & Campus Drives for AIT Jaipur...');
  const partnerCompaniesData = [
    {
      company_name: 'Tata Consultancy Services (TCS)',
      industry: 'IT Services & Consulting',
      recruiter_name: 'Pooja Deshmukh',
      recruiter_email: 'campus.relations@tcs.com',
      partnership_status: 'ACTIVE',
      tier: 'TIER_1',
      website: 'https://www.tcs.com',
      notes: 'Annual campus recruitment MoU active. Ninja & Digital hiring partner.',
      job: {
        title: 'Assistant Systems Engineer (TCS Digital)',
        description: 'Design and develop scalable cloud microservices, APIs, and modern web applications for enterprise clients.',
        skills: 'Java, Python, SQL, REST APIs',
        location: 'Jaipur / Noida',
        experience_level: 'Entry Level (Fresher)',
        job_type: 'Full Time',
        workplace_type: 'Hybrid',
        target_domain: 'fullstack',
        min_cgpa: 7.0,
        min_interview_score: 75,
        min_coding_solved: 5
      }
    },
    {
      company_name: 'Infosys Limited',
      industry: 'Cloud, AI & Digital Transformation',
      recruiter_name: 'Vikramaditya Sengupta',
      recruiter_email: 'campus.hiring@infosys.com',
      partnership_status: 'ACTIVE',
      tier: 'TIER_1',
      website: 'https://www.infosys.com',
      notes: 'Specialist Programmer (Power Programmer) campus drive.',
      job: {
        title: 'Specialist Programmer (AI & Full Stack)',
        description: 'Lead engineering projects leveraging generative AI, data engineering pipelines, and modern frontend frameworks.',
        skills: 'React, Node.js, Python, Machine Learning',
        location: 'Bangalore / Hybrid',
        experience_level: 'Entry Level (Fresher)',
        job_type: 'Full Time',
        workplace_type: 'Hybrid',
        target_domain: 'ai',
        min_cgpa: 7.5,
        min_interview_score: 80,
        min_coding_solved: 10
      }
    },
    {
      company_name: 'Wipro Technologies',
      industry: 'IT Consulting & Enterprise Cloud',
      recruiter_name: 'Sunil Nair',
      recruiter_email: 'talent.acquisition@wipro.com',
      partnership_status: 'MOU_SIGNED',
      tier: 'TIER_1',
      website: 'https://www.wipro.com',
      notes: 'Turbo campus hiring program with advanced certification sponsorship.',
      job: {
        title: 'Project Engineer (Cloud & DevOps)',
        description: 'Implement automated CI/CD pipelines, container orchestration, and cloud infrastructure monitoring.',
        skills: 'Linux, Docker, Python, AWS basics',
        location: 'Pune / Remote',
        experience_level: 'Entry Level (Fresher)',
        job_type: 'Full Time',
        workplace_type: 'Remote',
        target_domain: 'backend',
        min_cgpa: 6.8,
        min_interview_score: 70,
        min_coding_solved: 5
      }
    },
    {
      company_name: 'Zomato / Blinkit Tech',
      industry: 'Consumer Tech & Quick Commerce',
      recruiter_name: 'Rohan Kumar',
      recruiter_email: 'campus.recruiter@zomato.com',
      partnership_status: 'ACTIVE',
      tier: 'PRODUCT_MNC',
      website: 'https://www.zomato.com',
      notes: 'Product Engineering hiring for high-throughput distributed order management.',
      job: {
        title: 'Associate Software Engineer (Backend Systems)',
        description: 'Build ultra low-latency services handling millions of concurrent orders, real-time geolocation, and dispatch algorithms.',
        skills: 'Go, Java, PostgreSQL, Redis, Kafka',
        location: 'Gurgaon / Hybrid',
        experience_level: 'Entry Level (Fresher)',
        job_type: 'Full Time',
        workplace_type: 'Hybrid',
        target_domain: 'backend',
        min_cgpa: 8.0,
        min_interview_score: 85,
        min_coding_solved: 15
      }
    }
  ];

  // Resolve an HR user or Admin as creator
  const hrUserRes = await query("SELECT id FROM users WHERE email LIKE '%hr%ait%' LIMIT 1");
  const jobCreatorId = hrUserRes.rows[0]?.id || adminId;

  // Resolve Aarav and Diya for test applications
  const aaravRes = await query("SELECT id FROM users WHERE email = 'aarav.sharma@aitjaipur.edu' LIMIT 1");
  const diyaRes = await query("SELECT id FROM users WHERE email = 'diya.patel@aitjaipur.edu' LIMIT 1");
  const ishitaRes = await query("SELECT id FROM users WHERE email = 'ishita.singhal@aitjaipur.edu' LIMIT 1");

  for (const comp of partnerCompaniesData) {
    let compRes = await query(
      'SELECT id FROM college_partner_companies WHERE college_id = $1 AND LOWER(company_name) = LOWER($2)',
      [collegeId, comp.company_name]
    );
    let companyId;
    if (compRes.rows.length > 0) {
      companyId = compRes.rows[0].id;
      await query(
        `UPDATE college_partner_companies 
         SET industry = $1, recruiter_name = $2, recruiter_email = $3, partnership_status = $4, tier = $5, website = $6, notes = $7, updated_at = NOW()
         WHERE id = $8`,
        [comp.industry, comp.recruiter_name, comp.recruiter_email, comp.partnership_status, comp.tier, comp.website, comp.notes, companyId]
      );
    } else {
      const newComp = await query(
        `INSERT INTO college_partner_companies (
           college_id, company_name, industry, recruiter_name, recruiter_email, partnership_status, tier, website, notes, mou_signed
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         RETURNING id`,
        [collegeId, comp.company_name, comp.industry, comp.recruiter_name, comp.recruiter_email, comp.partnership_status, comp.tier, comp.website, comp.notes]
      );
      companyId = newComp.rows[0].id;
    }

    // Seed active placement drive job
    const j = comp.job;
    let jobCheck = await query(
      'SELECT id FROM hr_jobs WHERE college_id = $1 AND partner_company_id = $2 AND LOWER(title) = LOWER($3)',
      [collegeId, companyId, j.title]
    );
    let jobId;
    if (jobCheck.rows.length > 0) {
      jobId = jobCheck.rows[0].id;
    } else {
      const newJ = await query(
        `INSERT INTO hr_jobs (
           college_id, creator_id, partner_company_id, company_name, title, description, skills,
           location, experience_level, job_type, workplace_type, target_domain,
           min_cgpa, min_interview_score, min_coding_solved, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'OPEN')
         RETURNING id`,
        [
          collegeId, jobCreatorId, companyId, comp.company_name, j.title, j.description, j.skills,
          j.location, j.experience_level, j.job_type, j.workplace_type, j.target_domain,
          j.min_cgpa, j.min_interview_score, j.min_coding_solved
        ]
      );
      jobId = newJ.rows[0].id;
    }

    // Seed test student applications
    if (jobId && aaravRes.rows[0]?.id) {
      await query(
        `INSERT INTO hr_applications (job_id, candidate_id, status)
         VALUES ($1, $2, 'REVIEWING')
         ON CONFLICT DO NOTHING`,
        [jobId, aaravRes.rows[0].id]
      ).catch(() => {});
    }
    if (jobId && comp.company_name.includes('TCS') && diyaRes.rows[0]?.id) {
      await query(
        `INSERT INTO hr_applications (job_id, candidate_id, status)
         VALUES ($1, $2, 'SHORTLISTED')
         ON CONFLICT DO NOTHING`,
        [jobId, diyaRes.rows[0].id]
      ).catch(() => {});
    }
    if (jobId && comp.company_name.includes('Zomato') && ishitaRes.rows[0]?.id) {
      await query(
        `INSERT INTO hr_applications (job_id, candidate_id, status)
         VALUES ($1, $2, 'OFFERED')
         ON CONFLICT DO NOTHING`,
        [jobId, ishitaRes.rows[0].id]
      ).catch(() => {});
    }

    console.log(`✅ Partner Company & Placement Drive Ready: ${comp.company_name} -> ${j.title}`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 10 STUDENTS, 2 FACULTY & 4 PARTNER COMPANIES SEEDED! 🎉');
  console.log('======================================================\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
