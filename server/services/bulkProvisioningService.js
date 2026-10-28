import bcrypt from 'bcrypt';
import db from '../db.js';

/**
 * Bulk Provisioning Service
 * Efficiently provisions student and teacher accounts for an educational institution.
 * Pre-assigns departments, batches, and roles so that users can instantly log in
 * with pre-provided credentials without manual sign-up or verification friction.
 */
export async function bulkProvisionUsers(collegeId, adminUserId, usersList, options = {}) {
  const {
    forcePasswordChange = true,
    autoCreateDepartmentsAndBatches = true,
    defaultPasswordPattern = null // e.g. custom prefix or null to use ${code}@2026
  } = options;

  if (!collegeId) {
    throw new Error('College ID is required for bulk provisioning');
  }

  if (!Array.isArray(usersList) || usersList.length === 0) {
    throw new Error('Users list must be a non-empty array');
  }

  // Verify college exists and is active
  const colRes = await db.query(
    'SELECT id, name, code, domain, status FROM colleges WHERE id = $1',
    [collegeId]
  );
  if (colRes.rows.length === 0) {
    throw new Error('College not found');
  }
  const college = colRes.rows[0];
  if (college.status !== 'ACTIVE') {
    throw new Error(`College ${college.name} is not ACTIVE (status: ${college.status})`);
  }

  // Pre-fetch departments and batches for this college for fast resolution
  const deptRes = await db.query(
    'SELECT id, name, code FROM departments WHERE college_id = $1',
    [collegeId]
  );
  const deptMap = new Map(); // key: upper code or lower name -> department row
  deptRes.rows.forEach(d => {
    if (d.code) deptMap.set(d.code.trim().toUpperCase(), d);
    if (d.name) deptMap.set(d.name.trim().toLowerCase(), d);
  });

  const batchRes = await db.query(
    'SELECT id, name, department_id, academic_year FROM batches WHERE college_id = $1',
    [collegeId]
  );
  const batchMap = new Map(); // key: lower batch name -> batch row
  batchRes.rows.forEach(b => {
    if (b.name) batchMap.set(b.name.trim().toLowerCase(), b);
  });

  const provisionedUsers = [];
  const errors = [];

  for (let i = 0; i < usersList.length; i++) {
    const raw = usersList[i];
    const rowNum = i + 1;

    try {
      const fullName = (raw.name || raw.full_name || '').trim();
      const rawEmail = (raw.email || raw.institutional_email || '').trim().toLowerCase();
      let rawRole = (raw.role || 'STUDENT').trim().toUpperCase();
      const rollNumber = (raw.roll_number || raw.student_id || raw.rollNo || '').trim() || null;
      const deptInput = (raw.department || raw.department_code || raw.dept || '').trim();
      const batchInput = (raw.batch || raw.batch_name || raw.batch_id_name || '').trim();
      const academicYear = (raw.academic_year || raw.year || '2026-2027').trim();

      if (!fullName) {
        throw new Error(`Row ${rowNum}: Name is required`);
      }
      if (!rawEmail || !rawEmail.includes('@')) {
        throw new Error(`Row ${rowNum}: Valid email address is required for ${fullName}`);
      }

      // Normalize role
      let systemRole = 'STUDENT';
      if (rawRole === 'TEACHER' || rawRole === 'TUTOR' || rawRole === 'FACULTY' || rawRole === 'PROFESSOR') {
        systemRole = 'TUTOR';
      } else if (rawRole === 'ADMIN' || rawRole === 'COLLEGE_ADMIN') {
        systemRole = 'COLLEGE_ADMIN';
      }

      // Resolve initial password
      let initialPassword = (raw.password || raw.initial_password || '').trim();
      if (!initialPassword) {
        if (defaultPasswordPattern) {
          initialPassword = `${defaultPasswordPattern}@${college.code.toUpperCase()}`;
        } else {
          initialPassword = `${college.code.toUpperCase()}@2026`;
        }
      }

      // Department resolution / auto-creation
      let resolvedDeptId = null;
      let resolvedDeptCode = deptInput ? deptInput.toUpperCase() : null;
      if (deptInput) {
        const lookup = deptMap.get(deptInput.toUpperCase()) || deptMap.get(deptInput.toLowerCase());
        if (lookup) {
          resolvedDeptId = lookup.id;
          resolvedDeptCode = lookup.code;
        } else if (autoCreateDepartmentsAndBatches) {
          const newDept = await db.query(
            'INSERT INTO departments (college_id, name, code) VALUES ($1, $2, $3) RETURNING *',
            [collegeId, deptInput, resolvedDeptCode || deptInput.toUpperCase()]
          );
          resolvedDeptId = newDept.rows[0].id;
          resolvedDeptCode = newDept.rows[0].code;
          deptMap.set(resolvedDeptCode, newDept.rows[0]);
          deptMap.set(deptInput.toLowerCase(), newDept.rows[0]);
        }
      }

      // Batch resolution / auto-creation
      let resolvedBatchId = null;
      if (batchInput) {
        const batchLookup = batchMap.get(batchInput.toLowerCase());
        if (batchLookup) {
          resolvedBatchId = batchLookup.id;
        } else if (autoCreateDepartmentsAndBatches) {
          const newBatch = await db.query(
            'INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, $3, $4) RETURNING *',
            [collegeId, resolvedDeptId, batchInput, academicYear]
          );
          resolvedBatchId = newBatch.rows[0].id;
          batchMap.set(batchInput.toLowerCase(), newBatch.rows[0]);
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      // Check if user account already exists in users table
      const existingUserRes = await db.query(
        'SELECT id, full_name, email FROM users WHERE LOWER(email) = $1 OR LOWER(college_email) = $1 LIMIT 1',
        [rawEmail]
      );

      let userId;
      if (existingUserRes.rows.length > 0) {
        userId = existingUserRes.rows[0].id;
        await db.query(`
          UPDATE users
          SET password_hash = $1,
              full_name = COALESCE(NULLIF($2, ''), full_name),
              college_email = $3,
              college_email_verified = TRUE,
              college_email_verified_at = COALESCE(college_email_verified_at, NOW()),
              must_change_password = $4,
              student_id_number = COALESCE($5, student_id_number),
              account_lifecycle_status = 'ACTIVE_STUDENT',
              updated_at = NOW()
          WHERE id = $6
        `, [
          passwordHash,
          fullName,
          rawEmail,
          Boolean(forcePasswordChange),
          rollNumber,
          userId
        ]);
      } else {
        const insertUser = await db.query(`
          INSERT INTO users (
            full_name, email, personal_email, personal_email_verified, personal_email_verified_at,
            college_email, college_email_verified, college_email_verified_at,
            password_hash, must_change_password, student_id_number, account_lifecycle_status
          ) VALUES (
            $1, $2, $2, TRUE, NOW(),
            $2, TRUE, NOW(),
            $3, $4, $5, 'ACTIVE_STUDENT'
          ) RETURNING id
        `, [
          fullName,
          rawEmail,
          passwordHash,
          Boolean(forcePasswordChange),
          rollNumber
        ]);
        userId = insertUser.rows[0].id;
      }

      // Upsert into campus_users (Tenancy & Role)
      await db.query(`
        INSERT INTO campus_users (
          user_id, college_id, system_role, status, institutional_email,
          verified_at, verified_by, verification_method, roll_number, department_id, updated_at
        ) VALUES (
          $1, $2, $3, 'ACTIVE', $4,
          NOW(), $5, 'COLLEGE_PRE_PROVISIONED', $6, $7, NOW()
        )
        ON CONFLICT (user_id, college_id) DO UPDATE SET
          system_role = EXCLUDED.system_role,
          status = 'ACTIVE',
          institutional_email = EXCLUDED.institutional_email,
          roll_number = COALESCE(EXCLUDED.roll_number, campus_users.roll_number),
          department_id = COALESCE(EXCLUDED.department_id, campus_users.department_id),
          verification_method = 'COLLEGE_PRE_PROVISIONED',
          updated_at = NOW()
      `, [
        userId,
        collegeId,
        systemRole,
        rawEmail,
        adminUserId || null,
        rollNumber,
        resolvedDeptId
      ]);

      // Enroll into Batch if applicable
      if (resolvedBatchId) {
        if (systemRole === 'STUDENT') {
          await db.query(`
            INSERT INTO student_enrollments (student_user_id, batch_id, status)
            VALUES ($1, $2, 'ACTIVE')
            ON CONFLICT DO NOTHING
          `, [userId, resolvedBatchId]);
        } else if (systemRole === 'TUTOR') {
          await db.query(`
            INSERT INTO batch_tutors (batch_id, tutor_user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [resolvedBatchId, userId]);
        }
      }

      // Keep college_approved_roster in sync for auditing
      await db.query(`
        INSERT INTO college_approved_roster (
          college_id, institutional_email, full_name, role, department_code,
          academic_year, batch_id, status, enrolled_user_id, enrolled_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'ENROLLED', $8, NOW()
        )
        ON CONFLICT (college_id, institutional_email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          department_code = EXCLUDED.department_code,
          academic_year = EXCLUDED.academic_year,
          batch_id = COALESCE(EXCLUDED.batch_id, college_approved_roster.batch_id),
          status = 'ENROLLED',
          enrolled_user_id = EXCLUDED.enrolled_user_id,
          enrolled_at = NOW(),
          updated_at = NOW()
      `, [
        collegeId,
        rawEmail,
        fullName,
        systemRole,
        resolvedDeptCode,
        academicYear,
        resolvedBatchId,
        userId
      ]);

      provisionedUsers.push({
        id: userId,
        name: fullName,
        email: rawEmail,
        role: systemRole,
        initial_password: initialPassword,
        department: resolvedDeptCode,
        batch: batchInput || null,
        roll_number: rollNumber,
        must_change_password: Boolean(forcePasswordChange)
      });

    } catch (rowErr) {
      errors.push({
        row: rowNum,
        name: raw.name || raw.full_name || 'Unknown',
        email: raw.email || 'N/A',
        error: rowErr.message
      });
    }
  }

  return {
    success: true,
    totalReceived: usersList.length,
    provisionedCount: provisionedUsers.length,
    errorCount: errors.length,
    college: {
      id: college.id,
      name: college.name,
      code: college.code
    },
    users: provisionedUsers,
    errors
  };
}
