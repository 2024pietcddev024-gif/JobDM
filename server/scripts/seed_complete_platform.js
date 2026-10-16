import db from '../db.js';
import bcrypt from 'bcrypt';

async function seed() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[SEED] Starting complete multi-role platform integration seed...');

    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 1. Ensure College piet24cd exists
    let colRes = await client.query("SELECT id FROM colleges WHERE code = 'piet24cd'");
    let collegeId;
    if (colRes.rows.length === 0) {
      const newCol = await client.query(`
        INSERT INTO colleges (name, code, domain, status)
        VALUES ('PIET College', 'piet24cd', 'piet.edu', 'ACTIVE')
        RETURNING id
      `);
      collegeId = newCol.rows[0].id;
    } else {
      collegeId = colRes.rows[0].id;
    }
    console.log('[SEED] College piet24cd verified:', collegeId);

    // 2. Ensure Departments exist in piet24cd
    const depts = [
      { name: 'Computer Science Engineering', code: 'CSE' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Artificial Intelligence & Machine Learning', code: 'AIML' }
    ];

    const deptMap = {};
    for (const d of depts) {
      let dRes = await client.query(
        'SELECT id FROM departments WHERE college_id = $1 AND code = $2',
        [collegeId, d.code]
      );
      if (dRes.rows.length === 0) {
        const newD = await client.query(
          'INSERT INTO departments (college_id, name, code) VALUES ($1, $2, $3) RETURNING id',
          [collegeId, d.name, d.code]
        );
        deptMap[d.code] = newD.rows[0].id;
      } else {
        deptMap[d.code] = dRes.rows[0].id;
      }
    }
    console.log('[SEED] Departments verified:', deptMap);

    // 3. Ensure Teacher Account exists and is assigned to piet24cd
    let teacherUserRes = await client.query("SELECT id FROM users WHERE email = 'teacher.test1@jobdm.edu'");
    let teacherUserId;
    if (teacherUserRes.rows.length === 0) {
      const newT = await client.query(`
        INSERT INTO users (full_name, email, password_hash, target_role, target_level)
        VALUES ('teacher.test1', 'teacher.test1@jobdm.edu', $1, 'Computer Educator', 'Senior')
        RETURNING id
      `, [passwordHash]);
      teacherUserId = newT.rows[0].id;
    } else {
      teacherUserId = teacherUserRes.rows[0].id;
      await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, teacherUserId]);
    }

    // Ensure teacher has TUTOR campus_user for piet24cd
    await client.query(`
      INSERT INTO campus_users (user_id, college_id, system_role, status)
      VALUES ($1, $2, 'TUTOR', 'ACTIVE')
      ON CONFLICT (user_id, college_id) DO UPDATE SET system_role = 'TUTOR', status = 'ACTIVE'
    `, [teacherUserId, collegeId]);
    console.log('[SEED] Teacher teacher.test1 verified as TUTOR in piet24cd');

    // 4. Ensure HR Account Dev Sharma exists
    let hrUserRes = await client.query("SELECT id FROM users WHERE email = 'hr-piet24cd-nuen0k@hr.jobdm.com'");
    let hrUserId;
    if (hrUserRes.rows.length === 0) {
      const newHR = await client.query(`
        INSERT INTO users (full_name, email, password_hash, target_role, target_level)
        VALUES ('Dev Sharma', 'hr-piet24cd-nuen0k@hr.jobdm.com', $1, 'HR Director', 'Senior')
        RETURNING id
      `, [passwordHash]);
      hrUserId = newHR.rows[0].id;
    } else {
      hrUserId = hrUserRes.rows[0].id;
      // Also ensure Dev Sharma has clean password123 so login works seamlessly
      await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, hrUserId]);
    }

    await client.query(`
      INSERT INTO campus_users (user_id, college_id, system_role, status)
      VALUES ($1, $2, 'HR', 'ACTIVE')
      ON CONFLICT (user_id, college_id) DO UPDATE SET system_role = 'HR', status = 'ACTIVE'
    `, [hrUserId, collegeId]);
    console.log('[SEED] HR Dev Sharma verified as HR in piet24cd');

    // 5. Ensure Batches exist and assigned to Teacher
    const batchesData = [
      { name: 'CSE Final Year', academic_year: '2026-2027', deptCode: 'CSE' },
      { name: 'IT Third Year', academic_year: '2026-2027', deptCode: 'IT' },
      { name: 'AIML Batch', academic_year: '2026-2027', deptCode: 'AIML' }
    ];

    const batchMap = {};
    for (const b of batchesData) {
      let bRes = await client.query(
        'SELECT id FROM batches WHERE college_id = $1 AND name = $2',
        [collegeId, b.name]
      );
      let bId;
      if (bRes.rows.length === 0) {
        const newB = await client.query(`
          INSERT INTO batches (college_id, department_id, name, academic_year, status)
          VALUES ($1, $2, $3, $4, 'ACTIVE')
          RETURNING id
        `, [collegeId, deptMap[b.deptCode], b.name, b.academic_year]);
        bId = newB.rows[0].id;
      } else {
        bId = bRes.rows[0].id;
      }
      batchMap[b.name] = bId;

      // Assign teacher to batch
      await client.query(`
        INSERT INTO batch_tutors (batch_id, tutor_user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [bId, teacherUserId]);
    }
    console.log('[SEED] Batches verified & assigned to teacher:', batchMap);

    // 6. Ensure Students exist, are enrolled in batches, and have campus status
    const studentProfiles = [
      { name: 'Arjun Sharma', email: 'arjun@gmail.com', batchName: 'CSE Final Year', role: 'Full Stack Developer', level: 'Advanced' },
      { name: 'Priya Patel', email: 'priya@gmail.com', batchName: 'CSE Final Year', role: 'Frontend Developer', level: 'Intermediate' },
      { name: 'Rahul Kumar', email: 'rahul@gmail.com', batchName: 'IT Third Year', role: 'Frontend Developer', level: 'Intermediate' },
      { name: 'Sneha Gupta', email: 'sneha@gmail.com', batchName: 'AIML Batch', role: 'AI Engineer', level: 'Advanced' },
      { name: 'Ananya Singh', email: 'ananya@gmail.com', batchName: 'CSE Final Year', role: 'Backend Developer', level: 'Advanced' },
      { name: 'Karan Mehta', email: 'karan@gmail.com', batchName: 'IT Third Year', role: 'Data Analyst', level: 'Intermediate' },
      { name: 'Priya Sharma', email: 'priyasharma@gmail.com', batchName: 'CSE Final Year', role: 'UI/UX Designer', level: 'Intermediate' },
      { name: 'Aman Tiwari', email: 'aman@gmail.com', batchName: 'IT Third Year', role: 'Backend Developer', level: 'Beginner' }
    ];

    const studentMap = {};
    for (const sp of studentProfiles) {
      let uRes = await client.query('SELECT id FROM users WHERE email = $1', [sp.email]);
      let uId;
      if (uRes.rows.length === 0) {
        const newU = await client.query(`
          INSERT INTO users (full_name, email, password_hash, target_role, target_level, streak_days, preferred_coding_language)
          VALUES ($1, $2, $3, $4, $5, 5, 'JavaScript')
          RETURNING id
        `, [sp.name, sp.email, passwordHash, sp.role, sp.level]);
        uId = newU.rows[0].id;
      } else {
        uId = uRes.rows[0].id;
        await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, uId]);
      }
      studentMap[sp.email] = uId;

      // Ensure campus_users as STUDENT
      await client.query(`
        INSERT INTO campus_users (user_id, college_id, system_role, status)
        VALUES ($1, $2, 'STUDENT', 'ACTIVE')
        ON CONFLICT (user_id, college_id) DO UPDATE SET system_role = 'STUDENT', status = 'ACTIVE'
      `, [uId, collegeId]);

      // Enroll in batch
      const targetBatchId = batchMap[sp.batchName];
      if (targetBatchId) {
        await client.query(`
          INSERT INTO student_enrollments (student_user_id, batch_id, status)
          VALUES ($1, $2, 'ACTIVE')
          ON CONFLICT (student_user_id, batch_id) DO UPDATE SET status = 'ACTIVE'
        `, [uId, targetBatchId]);
      }
    }
    console.log('[SEED] Students verified & enrolled in batches');

    // 7. Seed realistic Interview Sessions for students (e.g. Arjun Sharma)
    const arjunId = studentMap['arjun@gmail.com'];
    if (arjunId) {
      const existingSessions = await client.query('SELECT id FROM interview_sessions WHERE user_id = $1', [arjunId]);
      if (existingSessions.rows.length === 0) {
        const sRes = await client.query(`
          INSERT INTO interview_sessions (
            user_id, category, role, difficulty, mode, overall_score, duration_minutes, summary
          )
          VALUES ($1, 'Technical', 'Full Stack Developer', 'Medium', 'voice', 85.0, 24, 'Demonstrated excellent problem solving and system design skills.')
          RETURNING id
        `, [arjunId]);
        const sessionId = sRes.rows[0].id;

        // Add questions, answers, and scores
        const qRes = await client.query(`
          INSERT INTO questions (session_id, question_text, question_type, topics)
          VALUES ($1, 'How does JavaScript handle asynchronous concurrency under the event loop?', 'conceptual', '["JavaScript", "Concurrency", "Event Loop"]')
          RETURNING id
        `, [sessionId]);
        const qId = qRes.rows[0].id;

        const aRes = await client.query(`
          INSERT INTO answers (question_id, transcript, wpm, filler_words_count, eye_contact_score)
          VALUES ($1, 'JavaScript uses a single-threaded event loop with a call stack, web APIs, task queue (macrotasks), and microtask queue for promises.', 135, 2, 92)
          RETURNING id
        `, [qId]);
        const aId = aRes.rows[0].id;

        await client.query(`
          INSERT INTO scores (
            answer_id, accuracy_score, communication_score, confidence_score, depth_score, overall_score,
            strengths, improvements, detailed_feedback
          )
          VALUES (
            $1, 88.0, 80.0, 85.0, 87.0, 85.0,
            '["Strong problem-solving approach", "Good code structure and clean logic", "Clear explanation of concepts"]',
            '["Can improve time-complexity analysis", "Work on system design concepts", "Practice more edge case handling"]',
            'Candidate accurately described microtask queues and promises versus timers in V8.'
          )
        `, [aId]);
      }

      // Add coding attempts for Arjun
      await client.query(`
        INSERT INTO coding_attempts (user_id, problem_id, language, code_content, status)
        VALUES 
          ($1, 'two-sum', 'javascript', 'function twoSum(nums, target) { ... }', 'solved'),
          ($1, 'reverse-linked-list', 'javascript', 'function reverseList(head) { ... }', 'solved'),
          ($1, 'valid-parentheses', 'javascript', 'function isValid(s) { ... }', 'solved')
      `, [arjunId]);
    }

    // 8. Seed HR Jobs for Dev Sharma (PIET College)
    const jobsData = [
      {
        title: 'Frontend Developer',
        description: 'We are looking for a skilled Frontend Developer with experience in modern web technologies and high performance interfaces.',
        skills: 'React, JavaScript, TypeScript, TailwindCSS',
        experience_level: 'Entry Level',
        location: 'Remote',
        job_type: 'Full Time',
        workplace_type: 'Remote',
        status: 'OPEN'
      },
      {
        title: 'Backend Developer',
        description: 'Join our backend team to build scalable APIs, microservices, and high concurrency databases.',
        skills: 'Node.js, Express, PostgreSQL, Redis',
        experience_level: 'Intermediate',
        location: 'On-site',
        job_type: 'Full Time',
        workplace_type: 'On-site',
        status: 'OPEN'
      },
      {
        title: 'Data Analyst',
        description: 'Work with data to generate insights, reporting dashboards, and support business decision-making.',
        skills: 'SQL, Python, Excel, Data Visualization',
        experience_level: 'Entry Level',
        location: 'Hybrid',
        job_type: 'Full Time',
        workplace_type: 'Hybrid',
        status: 'CLOSED'
      },
      {
        title: 'UI/UX Designer',
        description: 'Create responsive, intuitive web application prototypes and polished design systems.',
        skills: 'Figma, Design Systems, UX Research',
        experience_level: 'Intermediate',
        location: 'Remote',
        job_type: 'Full Time',
        workplace_type: 'Remote',
        status: 'OPEN'
      }
    ];

    const jobMap = {};
    for (const j of jobsData) {
      let jRes = await client.query(
        'SELECT id FROM hr_jobs WHERE college_id = $1 AND title = $2',
        [collegeId, j.title]
      );
      let jId;
      if (jRes.rows.length === 0) {
        const newJ = await client.query(`
          INSERT INTO hr_jobs (
            college_id, creator_id, title, description, skills, 
            experience_level, location, job_type, workplace_type, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          collegeId, hrUserId, j.title, j.description, j.skills,
          j.experience_level, j.location, j.job_type, j.workplace_type, j.status
        ]);
        jId = newJ.rows[0].id;
      } else {
        jId = jRes.rows[0].id;
      }
      jobMap[j.title] = jId;
    }
    console.log('[SEED] HR Jobs verified:', jobMap);

    // 9. Seed HR Applications matching the HR Prototype
    const applicationsData = [
      { candidateEmail: 'rahul@gmail.com', jobTitle: 'Frontend Developer', status: 'APPLIED', date: '2026-09-28' },
      { candidateEmail: 'ananya@gmail.com', jobTitle: 'Backend Developer', status: 'SHORTLISTED', date: '2026-09-27' },
      { candidateEmail: 'karan@gmail.com', jobTitle: 'Data Analyst', status: 'INTERVIEW_SCHEDULED', date: '2026-09-26' },
      { candidateEmail: 'priyasharma@gmail.com', jobTitle: 'UI/UX Designer', status: 'REJECTED', date: '2026-09-25' },
      { candidateEmail: 'aman@gmail.com', jobTitle: 'Backend Developer', status: 'APPLIED', date: '2026-09-24' }
    ];

    const appMap = {};
    for (const app of applicationsData) {
      const cId = studentMap[app.candidateEmail];
      const jId = jobMap[app.jobTitle];
      if (cId && jId) {
        let aRes = await client.query(
          'SELECT id FROM hr_applications WHERE job_id = $1 AND candidate_id = $2',
          [jId, cId]
        );
        let aId;
        if (aRes.rows.length === 0) {
          const newA = await client.query(`
            INSERT INTO hr_applications (job_id, candidate_id, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz)
            RETURNING id
          `, [jId, cId, app.status, app.date]);
          aId = newA.rows[0].id;
        } else {
          aId = aRes.rows[0].id;
          await client.query(`
            UPDATE hr_applications SET status = $1, created_at = $2::timestamptz WHERE id = $3
          `, [app.status, app.date, aId]);
        }
        appMap[app.candidateEmail] = aId;
      }
    }
    console.log('[SEED] HR Applications verified:', appMap);

    // 10. Seed Scheduled HR Interviews
    const interviewsData = [
      {
        appEmail: 'rahul@gmail.com',
        time: '2026-09-30 10:00:00+00',
        stage: 'Technical',
        status: 'SCHEDULED'
      },
      {
        appEmail: 'ananya@gmail.com',
        time: '2026-09-30 14:00:00+00',
        stage: 'HR',
        status: 'SCHEDULED'
      },
      {
        appEmail: 'karan@gmail.com',
        time: '2026-10-01 11:00:00+00',
        stage: 'Technical',
        status: 'COMPLETED',
        score: 85,
        feedback: 'Strong understanding of SQL and ETL pipelines.'
      },
      {
        appEmail: 'priyasharma@gmail.com',
        time: '2026-10-02 15:00:00+00',
        stage: 'HR',
        status: 'CANCELLED'
      }
    ];

    for (const int of interviewsData) {
      const appId = appMap[int.appEmail];
      if (appId) {
        let intRes = await client.query(
          'SELECT id FROM hr_interviews WHERE application_id = $1',
          [appId]
        );
        if (intRes.rows.length === 0) {
          await client.query(`
            INSERT INTO hr_interviews (
              application_id, interviewer_id, schedule_time, stage, status, score, feedback
            )
            VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7)
          `, [
            appId, hrUserId, int.time, int.stage, int.status, 
            int.score || null, int.feedback || null
          ]);
        }
      }
    }
    console.log('[SEED] HR Interviews scheduled & verified');

    await client.query('COMMIT');
    console.log('[SEED] Multi-role platform data seed completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED] Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
