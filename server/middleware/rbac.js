import db from '../db.js';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COLLEGE_ADMIN: 'COLLEGE_ADMIN',
  TUTOR: 'TUTOR',
  HR: 'HR',
  STUDENT: 'STUDENT',
};

export const PERMISSIONS = {
  // Student permissions
  INTERVIEW_PRACTICE: 'interview:practice',
  INTERVIEW_VIEW_OWN: 'interview:view_own',
  INTERVIEW_APPEAL: 'interview:appeal',
  JOB_APPLY: 'job:apply',

  // Tutor permissions
  INTERVIEW_VIEW_ASSIGNED: 'interview:view_assigned',
  INTERVIEW_ASSIGN: 'interview:assign',
  INTERVIEW_REVIEW_APPEAL: 'interview:review_appeal',
  BATCH_VIEW_STUDENTS: 'batch:view_students',

  // HR / Recruiter permissions
  HR_JOB_CREATE: 'hr:job_create',
  HR_JOB_MANAGE: 'hr:job_manage',
  HR_APPLICATION_VIEW: 'hr:application_view',
  HR_INTERVIEW_SCHEDULE: 'hr:interview_schedule',
  HR_CANDIDATE_DECISION: 'hr:candidate_decision',

  // College Admin permissions
  COLLEGE_MANAGE_DEPTS: 'college:manage_depts',
  COLLEGE_MANAGE_BATCHES: 'college:manage_batches',
  COLLEGE_MANAGE_TUTORS: 'college:manage_tutors',
  COLLEGE_MANAGE_STUDENTS: 'college:manage_students',
  COLLEGE_VIEW_ALL_REPORTS: 'college:view_all_reports',

  // Super Admin permissions
  PLATFORM_MANAGE_COLLEGES: 'platform:manage_colleges',
  PLATFORM_VIEW_ALL: 'platform:view_all',
};

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  COLLEGE_ADMIN: [
    PERMISSIONS.INTERVIEW_VIEW_ASSIGNED,
    PERMISSIONS.COLLEGE_VIEW_ALL_REPORTS,
    PERMISSIONS.INTERVIEW_REVIEW_APPEAL,
    PERMISSIONS.BATCH_VIEW_STUDENTS,
    PERMISSIONS.HR_JOB_CREATE,
    PERMISSIONS.HR_JOB_MANAGE,
    PERMISSIONS.HR_APPLICATION_VIEW,
    PERMISSIONS.COLLEGE_MANAGE_DEPTS,
    PERMISSIONS.COLLEGE_MANAGE_BATCHES,
    PERMISSIONS.COLLEGE_MANAGE_TUTORS,
    PERMISSIONS.COLLEGE_MANAGE_STUDENTS,
  ],
  TUTOR: [
    PERMISSIONS.INTERVIEW_VIEW_ASSIGNED,
    PERMISSIONS.INTERVIEW_ASSIGN,
    PERMISSIONS.INTERVIEW_REVIEW_APPEAL,
    PERMISSIONS.BATCH_VIEW_STUDENTS,
  ],
  HR: [
    PERMISSIONS.HR_JOB_CREATE,
    PERMISSIONS.HR_JOB_MANAGE,
    PERMISSIONS.HR_APPLICATION_VIEW,
    PERMISSIONS.HR_INTERVIEW_SCHEDULE,
    PERMISSIONS.HR_CANDIDATE_DECISION,
  ],
  STUDENT: [
    PERMISSIONS.INTERVIEW_PRACTICE,
    PERMISSIONS.INTERVIEW_VIEW_OWN,
    PERMISSIONS.INTERVIEW_APPEAL,
    PERMISSIONS.JOB_APPLY,
  ],
};

/**
 * Returns permissions array for a given role.
 */
export function getPermissionsForRole(role) {
  const normalized = role ? String(role).toUpperCase().trim() : 'STUDENT';
  return ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS.STUDENT;
}

/**
 * Middleware: Attaches req.campusContext containing role, collegeId, and permissions.
 */
export const loadCampusContext = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  try {
    let query = `
      SELECT cu.id as campus_user_id, cu.college_id, cu.system_role, cu.status as membership_status, c.name as college_name, c.status as college_status
      FROM campus_users cu
      LEFT JOIN colleges c ON cu.college_id = c.id
      WHERE cu.user_id = $1
    `;
    const params = [req.user.id];

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
      if (row.system_role !== 'SUPER_ADMIN' && row.college_id) {
        if (row.college_status && row.college_status !== 'ACTIVE') {
          return res.status(403).json({
            error: `Access Restricted: Your educational institution (${row.college_name || 'College'}) is currently ${row.college_status.toLowerCase()}. Please contact your campus administrator.`
          });
        }
        if (row.membership_status !== 'ACTIVE') {
          return res.status(403).json({
            error: `Membership Restricted: Your institutional access is currently ${row.membership_status.toLowerCase()}. Institutional email verification or administrator approval is required.`
          });
        }
      }

      req.campusContext = {
        campusUserId: row.campus_user_id,
        collegeId: row.college_id,
        collegeName: row.college_name,
        systemRole: row.system_role,
        role: row.system_role,
        status: row.membership_status,
        permissions: getPermissionsForRole(row.system_role),
      };
    } else {
      // Standalone user without campus affiliation acts as STUDENT
      req.campusContext = {
        campusUserId: null,
        collegeId: null,
        collegeName: null,
        systemRole: ROLES.STUDENT,
        role: ROLES.STUDENT,
        status: 'ACTIVE',
        permissions: getPermissionsForRole(ROLES.STUDENT),
      };
    }
    next();
  } catch (error) {
    console.error('[loadCampusContext] error:', error);
    res.status(500).json({ error: 'Internal server error while resolving authorization context' });
  }
};

/**
 * Middleware: Enforces that the authenticated user possesses one of the allowed roles.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.campusContext?.systemRole || ROLES.STUDENT;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Forbidden: Role '${role}' lacks sufficient privileges for this operation. Required: [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
};

/**
 * Middleware: Enforces that the authenticated user possesses a specific permission.
 */
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = new Set(req.campusContext?.permissions || []);
    const hasAll = requiredPermissions.every((perm) => userPermissions.has(perm));
    if (!hasAll) {
      return res.status(403).json({
        error: `Forbidden: Missing required permission(s): [${requiredPermissions.join(', ')}]`,
      });
    }
    next();
  };
};

/**
 * Evaluates whether req.user has legitimate authority to view/access an interview session
 * based on ownership, tutor batch assignment, or organizational boundaries.
 */
export async function authorizeInterviewAccess(session, reqUser) {
  // 1. Direct owner candidate always has access
  if (session.user_id === reqUser.id) {
    return { authorized: true, reason: 'OWNER' };
  }

  // 2. Resolve requester's campus roles
  const requesterCampus = await db.query(
    "SELECT college_id, system_role FROM campus_users WHERE user_id = $1 AND status = 'ACTIVE'",
    [reqUser.id]
  );

  for (const row of requesterCampus.rows) {
    // Super Admin has platform-wide authority
    if (row.system_role === ROLES.SUPER_ADMIN) {
      return { authorized: true, reason: 'SUPER_ADMIN' };
    }

    // College Admin has authority within their college
    if (row.system_role === ROLES.COLLEGE_ADMIN) {
      // Check if session belongs to this college directly or candidate is enrolled in this college
      if (session.college_id && session.college_id === row.college_id) {
        return { authorized: true, reason: 'COLLEGE_ADMIN' };
      }
      const candidateCheck = await db.query(
        "SELECT 1 FROM campus_users WHERE user_id = $1 AND college_id = $2 AND status = 'ACTIVE' LIMIT 1",
        [session.user_id, row.college_id]
      );
      if (candidateCheck.rows.length > 0) {
        return { authorized: true, reason: 'COLLEGE_ADMIN' };
      }
    }

    // Tutor has authority ONLY for students in batches assigned to that tutor
    if (row.system_role === ROLES.TUTOR) {
      const tutorBatchCheck = await db.query(
        `SELECT 1 FROM student_enrollments se
         JOIN batch_tutors bt ON se.batch_id = bt.batch_id
         WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
         LIMIT 1`,
        [session.user_id, reqUser.id]
      );
      if (tutorBatchCheck.rows.length > 0) {
        return { authorized: true, reason: 'TUTOR_ASSIGNED' };
      }
    }

    // HR has authority if candidate applied to an HR job in this organization
    if (row.system_role === ROLES.HR) {
      const hrAppCheck = await db.query(
        `SELECT 1 FROM hr_applications ha
         JOIN hr_jobs hj ON ha.job_id = hj.id
         WHERE ha.candidate_id = $1 AND hj.college_id = $2
         LIMIT 1`,
        [session.user_id, row.college_id]
      );
      if (hrAppCheck.rows.length > 0) {
        return { authorized: true, reason: 'HR_APPLICANT' };
      }
    }
  }

  return { authorized: false, reason: 'FORBIDDEN' };
}
