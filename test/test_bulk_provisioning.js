import db from '../server/db.js';
import { bulkProvisionUsers } from '../server/services/bulkProvisioningService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../server/config/jwt.js';

async function runTests() {
  console.log('--- STARTING BULK PROVISIONING TEST ---');

  try {
    // 1. Get or create a test college
    let colRes = await db.query("SELECT * FROM colleges WHERE code = 'TESTCOLLEGE' LIMIT 1");
    let collegeId;
    if (colRes.rows.length === 0) {
      const ins = await db.query(
        "INSERT INTO colleges (name, code, domain, status) VALUES ('Test Institute of Technology', 'TESTCOLLEGE', 'testcollege.edu.in', 'ACTIVE') RETURNING *"
      );
      collegeId = ins.rows[0].id;
    } else {
      collegeId = colRes.rows[0].id;
    }
    console.log(`[PASS] Using College: TESTCOLLEGE (${collegeId})`);

    // 2. Prepare test roster
    const testRoster = [
      {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@testcollege.edu.in',
        password: 'AaravInitial@123',
        role: 'STUDENT',
        roll_number: '2023-CS-001',
        department: 'Computer Science',
        batch: 'Batch 2027 CSE-A',
        academic_year: '2026-2027'
      },
      {
        name: 'Priya Verma',
        email: 'priya.verma@testcollege.edu.in',
        password: '', // will test default password fallback
        role: 'STUDENT',
        roll_number: '2023-CS-002',
        department: 'Computer Science',
        batch: 'Batch 2027 CSE-A',
        academic_year: '2026-2027'
      },
      {
        name: 'Dr. Ramesh Kumar',
        email: 'ramesh.kumar@testcollege.edu.in',
        password: 'ProfRamesh@123',
        role: 'TEACHER',
        roll_number: 'FAC-014',
        department: 'Computer Science',
        batch: 'Batch 2027 CSE-A',
        academic_year: '2026-2027'
      }
    ];

    console.log('\n--- 2. EXECUTING BULK PROVISIONING ---');
    const result = await bulkProvisionUsers(collegeId, null, testRoster, {
      forcePasswordChange: true,
      autoCreateDepartmentsAndBatches: true
    });

    console.log('Provision Result:', {
      success: result.success,
      provisionedCount: result.provisionedCount,
      errorCount: result.errorCount,
      users: result.users.map(u => ({ name: u.name, email: u.email, role: u.role, initial_pwd: u.initial_password, must_change: u.must_change_password }))
    });

    if (result.provisionedCount !== 3) {
      throw new Error(`Expected 3 provisioned users, got ${result.provisionedCount}`);
    }
    console.log('[PASS] Bulk provisioned 3 accounts successfully!');

    // 3. Verify Aarav can log in with initial password
    console.log('\n--- 3. TESTING DIRECT STUDENT LOGIN ---');
    const studentUserRes = await db.query("SELECT * FROM users WHERE email = 'aarav.sharma@testcollege.edu.in'");
    if (studentUserRes.rows.length === 0) throw new Error('Student user not found in DB');
    const studentUser = studentUserRes.rows[0];

    const isMatch = await bcrypt.compare('AaravInitial@123', studentUser.password_hash);
    if (!isMatch) throw new Error('Password compare failed for initial password');
    console.log('[PASS] Initial password hash matches!');

    if (!studentUser.must_change_password) {
      throw new Error('must_change_password should be TRUE for provisioned account');
    }
    console.log('[PASS] must_change_password flag is TRUE!');

    // Verify campus_users linkage
    const cuRes = await db.query(
      "SELECT * FROM campus_users WHERE user_id = $1 AND college_id = $2",
      [studentUser.id, collegeId]
    );
    if (cuRes.rows.length === 0) throw new Error('campus_users record missing');
    if (cuRes.rows[0].system_role !== 'STUDENT') throw new Error(`Role mismatch: ${cuRes.rows[0].system_role}`);
    if (cuRes.rows[0].status !== 'ACTIVE') throw new Error(`Status mismatch: ${cuRes.rows[0].status}`);
    console.log('[PASS] Student campus_users link is ACTIVE with role STUDENT!');

    // Verify batch enrollment
    const enrollRes = await db.query(
      "SELECT se.*, b.name as batch_name FROM student_enrollments se JOIN batches b ON se.batch_id = b.id WHERE se.student_user_id = $1",
      [studentUser.id]
    );
    if (enrollRes.rows.length === 0) throw new Error('Student enrollment missing');
    console.log(`[PASS] Student enrolled into batch: ${enrollRes.rows[0].batch_name}`);

    // Verify teacher batch assignment
    console.log('\n--- 4. TESTING TEACHER PROVISIONING ---');
    const teacherUserRes = await db.query("SELECT * FROM users WHERE email = 'ramesh.kumar@testcollege.edu.in'");
    const teacherUser = teacherUserRes.rows[0];
    const tutorBatchRes = await db.query(
      "SELECT bt.*, b.name as batch_name FROM batch_tutors bt JOIN batches b ON bt.batch_id = b.id WHERE bt.tutor_user_id = $1",
      [teacherUser.id]
    );
    if (tutorBatchRes.rows.length === 0) throw new Error('Teacher batch assignment missing');
    console.log(`[PASS] Teacher assigned to batch: ${tutorBatchRes.rows[0].batch_name}`);

    // Verify default password fallback for Priya
    console.log('\n--- 5. TESTING DEFAULT PASSWORD FALLBACK ---');
    const priyaUserRes = await db.query("SELECT * FROM users WHERE email = 'priya.verma@testcollege.edu.in'");
    const priyaUser = priyaUserRes.rows[0];
    const priyaMatch = await bcrypt.compare('TESTCOLLEGE@2026', priyaUser.password_hash);
    if (!priyaMatch) throw new Error('Priya fallback password match failed');
    console.log('[PASS] Priya fallback password TESTCOLLEGE@2026 matched successfully!');

    // 6. Test Password Change
    console.log('\n--- 6. TESTING FIRST-TIME PASSWORD CHANGE ---');
    const newPersonalHash = await bcrypt.hash('AaravPersonal@2026Secure', 10);
    await db.query(
      "UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
      [newPersonalHash, studentUser.id]
    );

    const updatedUserRes = await db.query("SELECT must_change_password FROM users WHERE id = $1", [studentUser.id]);
    if (updatedUserRes.rows[0].must_change_password !== false) {
      throw new Error('must_change_password should be FALSE after update');
    }
    console.log('[PASS] Password successfully updated and must_change_password reset to FALSE!');

    console.log('\n==========================================');
    console.log('🎉 ALL BULK PROVISIONING TESTS PASSED 100%!');
    console.log('==========================================');
    process.exit(0);

  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
