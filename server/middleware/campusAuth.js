import db from '../db.js';

export const loadCampusContext = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  try {
    let query = `
      SELECT 
        cu.id as campus_user_id, 
        cu.college_id, 
        cu.system_role, 
        cu.status as membership_status,
        cu.institutional_email,
        cu.verified_at,
        c.name as college_name,
        c.code as college_code,
        c.status as college_status
      FROM campus_users cu
      LEFT JOIN colleges c ON cu.college_id = c.id
      WHERE cu.user_id = $1
    `;
    let params = [req.user.id];

    if (req.user.active_college_id) {
      query += ' AND cu.college_id = $2';
      params.push(req.user.active_college_id);
    }

    query += `
      ORDER BY (CASE 
        WHEN cu.system_role = 'SUPER_ADMIN' THEN 1 
        WHEN cu.system_role = 'HR' THEN 2 
        WHEN cu.system_role = 'TUTOR' THEN 3 
        WHEN cu.system_role = 'COLLEGE_ADMIN' THEN 4 
        ELSE 5 
      END) ASC, cu.created_at DESC LIMIT 1
    `;

    const result = await db.query(query, params);

    if (result.rows.length > 0) {
      const row = result.rows[0];

      // Dynamic session enforcement on every request:
      // If user is affiliated with a college (not SUPER_ADMIN):
      if (row.system_role !== 'SUPER_ADMIN' && row.college_id) {
        // 1. Enforce live college status (stale token protection against suspended colleges)
        if (row.college_status && row.college_status !== 'ACTIVE') {
          return res.status(403).json({
            error: `Access Restricted: Your educational institution (${row.college_name || 'College'}) is currently ${row.college_status.toLowerCase()}. Please contact your campus administrator.`
          });
        }

        // 2. Enforce live campus user membership status
        if (row.membership_status !== 'ACTIVE') {
          return res.status(403).json({
            error: `Membership Restricted: Your institutional access is currently ${row.membership_status.toLowerCase()}. Institutional email verification or administrator approval is required.`
          });
        }
      }

      req.campusContext = {
        campus_user_id: row.campus_user_id,
        campusUserId: row.campus_user_id,
        college_id: row.college_id,
        collegeId: row.college_id,
        college_name: row.college_name,
        collegeName: row.college_name,
        college_code: row.college_code,
        collegeCode: row.college_code,
        system_role: row.system_role,
        role: row.system_role,
        status: row.membership_status,
        institutionalEmail: row.institutional_email,
        verifiedAt: row.verified_at,
        collegeStatus: row.college_status
      };
    } else {
      req.campusContext = null;
    }
    next();
  } catch (error) {
    console.error('[loadCampusContext] error:', error);
    res.status(500).json({ error: 'Server error while resolving campus context' });
  }
};

export const requireCampusUser = (req, res, next) => {
  if (!req.campusContext) {
    return res.status(403).json({ error: 'Campus access denied' });
  }
  next();
};

export const requireCampusRole = (...roles) => {
  return (req, res, next) => {
    if (!req.campusContext) {
      return res.status(403).json({ error: 'Campus access denied' });
    }
    if (!roles.includes(req.campusContext.system_role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient campus role' });
    }
    next();
  };
};

export const verifyBatchAccess = async (req, res, next) => {
  const { batchId } = req.params;
  const ctx = req.campusContext;

  if (!ctx) return res.status(403).json({ error: 'Campus access denied' });
  if (ctx.system_role === 'SUPER_ADMIN') return next();

  try {
    const batchRes = await db.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    
    const batchCollegeId = batchRes.rows[0].college_id;
    if (batchCollegeId !== ctx.college_id) {
      return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });
    }

    if (ctx.system_role === 'COLLEGE_ADMIN') return next();

    if (ctx.system_role === 'TUTOR') {
      const tutorRes = await db.query(
        'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
        [batchId, req.user.id]
      );
      if (tutorRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Not assigned to this batch' });
      return next();
    }

    if (ctx.system_role === 'STUDENT') {
      const studentRes = await db.query(
        "SELECT id FROM student_enrollments WHERE batch_id = $1 AND student_user_id = $2 AND status = 'ACTIVE'",
        [batchId, req.user.id]
      );
      if (studentRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Not enrolled in this batch' });
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    console.error('[verifyBatchAccess] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const verifyStudentAccess = async (req, res, next) => {
  const { studentId } = req.params; // student_user_id
  const ctx = req.campusContext;

  if (!ctx) return res.status(403).json({ error: 'Campus access denied' });
  if (ctx.system_role === 'SUPER_ADMIN') return next();

  // If user is accessing their own profile
  if (ctx.system_role === 'STUDENT' && req.user.id === studentId) return next();
  if (ctx.system_role === 'STUDENT' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Forbidden: Cannot access another student' });
  }

  try {
    // Determine the target student's college
    const studentCtxRes = await db.query(
      "SELECT college_id FROM campus_users WHERE user_id = $1 AND system_role = 'STUDENT' AND status = 'ACTIVE'",
      [studentId]
    );
    if (studentCtxRes.rows.length === 0) return res.status(404).json({ error: 'Student not found in Campus' });
    
    if (studentCtxRes.rows[0].college_id !== ctx.college_id) {
      return res.status(403).json({ error: 'Forbidden: Student belongs to another college' });
    }

    if (ctx.system_role === 'COLLEGE_ADMIN') return next();

    if (ctx.system_role === 'TUTOR') {
      // Check if tutor shares a batch with the student
      const sharedRes = await db.query(`
        SELECT 1 FROM student_enrollments se
        JOIN batch_tutors bt ON se.batch_id = bt.batch_id
        WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
        LIMIT 1
      `, [studentId, req.user.id]);
      
      if (sharedRes.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Student not in any assigned batches' });
      }
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    console.error('[verifyStudentAccess] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
