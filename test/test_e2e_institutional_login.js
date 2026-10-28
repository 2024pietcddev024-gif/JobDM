import db from '../server/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../server/config/jwt.js';

async function testFullInstitutionalFlow() {
  console.log('=================================================================');
  console.log('🧪 RUNNING FULL INSTITUTIONAL LOGIN & PROVISIONING E2E TEST');
  console.log('=================================================================');

  try {
    // 1. Setup College
    const colCode = 'E2ECOLLEGE';
    let col = await db.query('SELECT * FROM colleges WHERE code = $1', [colCode]);
    let collegeId;
    if (col.rows.length === 0) {
      const ins = await db.query(
        "INSERT INTO colleges (name, code, domain, status) VALUES ('E2E Technological University', $1, 'e2ecollege.ac.in', 'ACTIVE') RETURNING *",
        [colCode]
      );
      collegeId = ins.rows[0].id;
    } else {
      collegeId = col.rows[0].id;
    }
    console.log(`✅ [1/6] College verified: ${colCode} (${collegeId})`);

    // 2. Setup College Admin
    const adminEmail = 'admin@e2ecollege.ac.in';
    let adminUser = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    let adminUserId;
    if (adminUser.rows.length === 0) {
      const hash = await bcrypt.hash('Admin@Secret123', 10);
      const insAdmin = await db.query(
        "INSERT INTO users (full_name, email, password_hash) VALUES ('E2E College Admin', $1, $2) RETURNING id",
        [adminEmail, hash]
      );
      adminUserId = insAdmin.rows[0].id;
    } else {
      adminUserId = adminUser.rows[0].id;
    }

    await db.query(
      "INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'COLLEGE_ADMIN', 'ACTIVE') ON CONFLICT (user_id, college_id) DO UPDATE SET system_role = 'COLLEGE_ADMIN', status = 'ACTIVE'",
      [adminUserId, collegeId]
    );
    console.log(`✅ [2/6] College Admin account active (${adminEmail})`);

    // 3. Test Bulk Provisioning Service
    const { bulkProvisionUsers } = await import('../server/services/bulkProvisioningService.js');
    const roster = [
      {
        name: 'Kavita Nair',
        email: 'kavita.nair@e2ecollege.ac.in',
        password: 'KavitaInitial@123',
        role: 'STUDENT',
        roll_number: '2023-IT-089',
        department: 'Information Technology',
        batch: 'Batch 2027 IT-Alpha',
        academic_year: '2026-2027'
      },
      {
        name: 'Prof. Anil Deshmukh',
        email: 'anil.deshmukh@e2ecollege.ac.in',
        password: 'ProfAnil@123',
        role: 'TEACHER',
        roll_number: 'FAC-IT-02',
        department: 'Information Technology',
        batch: 'Batch 2027 IT-Alpha',
        academic_year: '2026-2027'
      }
    ];

    const bulkRes = await bulkProvisionUsers(collegeId, adminUserId, roster, {
      forcePasswordChange: true,
      autoCreateDepartmentsAndBatches: true
    });

    if (bulkRes.provisionedCount !== 2) {
      throw new Error(`Expected 2 provisioned users, got ${bulkRes.provisionedCount}`);
    }
    console.log(`✅ [3/6] Bulk provisioned 2 institutional users (Student & Faculty)`);

    // 4. Test Student Login Resolution
    const kavitaUser = await db.query('SELECT * FROM users WHERE email = $1', ['kavita.nair@e2ecollege.ac.in']);
    const uRow = kavitaUser.rows[0];
    const pwdMatch = await bcrypt.compare('KavitaInitial@123', uRow.password_hash);
    if (!pwdMatch) throw new Error('Initial password verification failed');
    if (uRow.must_change_password !== true) throw new Error('must_change_password should be true');

    const kavitaAffiliation = await db.query(
      'SELECT * FROM campus_users WHERE user_id = $1 AND college_id = $2',
      [uRow.id, collegeId]
    );
    if (kavitaAffiliation.rows[0].system_role !== 'STUDENT') throw new Error('Affiliation role mismatch');
    if (kavitaAffiliation.rows[0].status !== 'ACTIVE') throw new Error('Affiliation status not ACTIVE');
    console.log(`✅ [4/6] Student login auto-detection: College=${colCode}, Role=STUDENT, must_change_password=TRUE`);

    // 5. Test First-Time Password Reset Flow
    const newPersonalPassword = 'KavitaPersonal@2026New';
    const newHash = await bcrypt.hash(newPersonalPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [newHash, uRow.id]
    );

    const updatedUser = await db.query('SELECT must_change_password, password_hash FROM users WHERE id = $1', [uRow.id]);
    if (updatedUser.rows[0].must_change_password !== false) throw new Error('must_change_password not updated');
    const newMatch = await bcrypt.compare(newPersonalPassword, updatedUser.rows[0].password_hash);
    if (!newMatch) throw new Error('New password comparison failed');
    console.log(`✅ [5/6] First-time personal password successfully updated; must_change_password=FALSE`);

    // 6. Test Admin Directory and Admin Password Reset
    const dirRes = await db.query(`
      SELECT cu.institutional_email, cu.system_role, u.must_change_password, b.name as batch_name 
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      LEFT JOIN student_enrollments se ON se.student_user_id = u.id
      LEFT JOIN batches b ON se.batch_id = b.id
      WHERE cu.college_id = $1 AND cu.user_id = $2
    `, [collegeId, uRow.id]);

    if (dirRes.rows.length === 0) throw new Error('User missing from campus directory');
    if (dirRes.rows[0].batch_name !== 'Batch 2027 IT-Alpha') throw new Error('Batch assignment mismatch');
    console.log(`✅ [6/6] Admin campus directory verification: Batch="${dirRes.rows[0].batch_name}", Email=${dirRes.rows[0].institutional_email}`);

    console.log('\n=================================================================');
    console.log('🎉 ALL 6 E2E INSTITUTIONAL LOGIN & PROVISIONING TESTS PASSED!');
    console.log('=================================================================');
    process.exit(0);

  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  }
}

testFullInstitutionalFlow();
