import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { loadCampusContext, ROLES } from '../middleware/rbac.js';

const router = express.Router();

export const CONSENT_TYPES = {
  RESUME_PARSING: 'RESUME_PARSING',
  AUDIO_RECORDING: 'AUDIO_RECORDING',
  AI_PRACTICE_EVALUATION: 'AI_PRACTICE_EVALUATION',
  WEBCAM_COACHING: 'WEBCAM_COACHING',
  JOB_DATA_SHARING: 'JOB_DATA_SHARING',
};

// 1. GET /api/privacy/notice — Comprehensive Data Inventory & Purpose-Specific Notice
router.get('/notice', async (req, res) => {
  res.json({
    version: 'v1.0',
    effectiveDate: '2026-10-26',
    platform: 'JobDM / InterviewIQ',
    dataInventory: [
      {
        category: 'Identity & Authentication',
        fields: ['full_name', 'email', 'personal_email', 'college_email', 'password_hash'],
        purpose: 'Account creation, secure authentication, and institutional affiliation verification.',
        retention: 'Retained until account deletion.'
      },
      {
        category: 'Resumes & Career Documents',
        fields: ['file_name', 'file_url', 'extracted_skills', 'extracted_projects', 'raw_text'],
        purpose: 'Contextualizing interview questions to candidate background and matching eligible campus placement drives.',
        retention: 'Retained until updated or deleted by candidate.'
      },
      {
        category: 'Interview Practice & Transcripts',
        fields: ['interview_sessions', 'question_text', 'transcript', 'audio_recording_url', 'coding_content'],
        purpose: 'Formative AI practice evaluation, progress metrics, and academic tutor feedback.',
        retention: 'Active account tenure; audio recording URLs are purged after 90 days under automated retention.'
      },
      {
        category: 'Anti-Cheating Telemetry',
        fields: ['tab_switch_count', 'clipboard_violation_count', 'session_violations'],
        purpose: 'Integrity monitoring for institutional mock tests and verified campus placement screenings.',
        retention: 'Retained for 180 days after session completion.'
      },
      {
        category: 'Webcam Coaching (Client-Side Only)',
        fields: ['gaze_ratio', 'presentation_indicators'],
        purpose: 'Real-time on-device speech/presentation tips. Biometrics are NEVER transmitted or stored on server.',
        retention: 'Zero retention. Discarded immediately in browser memory.'
      }
    ],
    vendorDataProcessingControls: [
      {
        vendor: 'Google Cloud (Gemini API)',
        role: 'AI LLM Evaluation Sub-processor',
        processingLocation: 'Enterprise Protected Cloud',
        dataControls: 'Zero-data retention agreement: Customer prompt inputs are NOT used to train foundation models.'
      },
      {
        vendor: 'PostgreSQL Database Engine',
        role: 'Encrypted Persistent Database',
        processingLocation: 'Secure Cloud Infrastructure',
        dataControls: 'TLS in transit, encrypted storage at rest.'
      }
    ],
    retentionSchedule: {
      audioRecordingUrlsDays: 90,
      abandonedSessionCleanupDays: 30,
      accountDataAfterDeletion: 'Immediate hard purge'
    },
    candidateRights: [
      'Right to access & export personal data (JSON export)',
      'Right to granular consent withdrawal (audio, resume, AI evaluation)',
      'Right to rectification (updating profile and resume data)',
      'Right to erasure / Account deletion (permanent right to be forgotten)',
      'Right to human appeal on automated practice evaluations'
    ]
  });
});

// 2. GET /api/privacy/consents — Get active consents for authenticated user
router.get('/consents', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT consent_type, granted, policy_version, granted_at, withdrawn_at
       FROM user_consents
       WHERE user_id = $1`,
      [req.user.id]
    );

    const consentMap = {};
    Object.values(CONSENT_TYPES).forEach(type => {
      consentMap[type] = {
        granted: type !== CONSENT_TYPES.WEBCAM_COACHING, // Webcam defaults to false (explicit opt-in)
        granted_at: null,
        withdrawn_at: null
      };
    });

    result.rows.forEach(r => {
      consentMap[r.consent_type] = {
        granted: r.granted,
        granted_at: r.granted_at,
        withdrawn_at: r.withdrawn_at
      };
    });

    res.json({
      userId: req.user.id,
      consents: consentMap
    });
  } catch (err) {
    console.error('[privacy/consents] Error:', err);
    res.status(500).json({ error: 'Server error retrieving consents' });
  }
});

// 3. POST /api/privacy/consents — Grant or withdraw specific consent
router.post('/consents', authenticateToken, async (req, res) => {
  const { consentType, granted } = req.body;

  if (!consentType || !Object.values(CONSENT_TYPES).includes(consentType)) {
    return res.status(400).json({
      error: `Invalid consentType. Valid options are: [${Object.values(CONSENT_TYPES).join(', ')}]`
    });
  }

  const isGranted = Boolean(granted);
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  try {
    const query = `
      INSERT INTO user_consents (user_id, consent_type, granted, policy_version, granted_at, withdrawn_at, ip_address, user_agent, updated_at)
      VALUES ($1, $2, $3, 'v1.0', CASE WHEN $3 THEN NOW() ELSE NULL END, CASE WHEN NOT $3 THEN NOW() ELSE NULL END, $4, $5, NOW())
      ON CONFLICT (user_id, consent_type)
      DO UPDATE SET
        granted = $3,
        granted_at = CASE WHEN $3 THEN NOW() ELSE user_consents.granted_at END,
        withdrawn_at = CASE WHEN NOT $3 THEN NOW() ELSE NULL END,
        ip_address = $4,
        user_agent = $5,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(query, [req.user.id, consentType, isGranted, ipAddress, userAgent]);
    res.json({
      success: true,
      consent: result.rows[0],
      message: isGranted
        ? `Consent granted for '${consentType}'.`
        : `Consent withdrawn for '${consentType}'. Future processing under this purpose will cease.`
    });
  } catch (err) {
    console.error('[privacy/consents/update] Error:', err);
    res.status(500).json({ error: 'Server error updating consent' });
  }
});

// 4. GET /api/privacy/export — Candidate Data Portability (Export all personal records)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT id, full_name, email, personal_email, college_email, target_role, target_level, streak_days, preferred_coding_language, practice_languages, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const resumesRes = await db.query(
      `SELECT id, file_name, file_url, extracted_skills, extracted_projects, created_at
       FROM resumes WHERE user_id = $1`,
      [req.user.id]
    );

    const interviewsRes = await db.query(
      `SELECT id, category, role, difficulty, mode, overall_score, duration_minutes, summary, status, created_at, completed_at
       FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    const codingRes = await db.query(
      `SELECT problem_id, language, status, created_at
       FROM coding_attempts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    const consentsRes = await db.query(
      `SELECT consent_type, granted, granted_at, withdrawn_at, policy_version
       FROM user_consents WHERE user_id = $1`,
      [req.user.id]
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userRes.rows[0],
      resumes: resumesRes.rows,
      interviewSessions: interviewsRes.rows,
      codingAttempts: codingRes.rows,
      consents: consentsRes.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="personal_data_export_${req.user.id}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('[privacy/export] Error:', err);
    res.status(500).json({ error: 'Server error exporting personal data' });
  }
});

// 5. DELETE /api/privacy/account — Right to Erasure / Total Account & Personal Data Deletion
router.delete('/account', authenticateToken, async (req, res) => {
  const { confirmationPhrase, password } = req.body;

  if (confirmationPhrase !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      error: 'Please confirm deletion by providing confirmationPhrase: "DELETE MY ACCOUNT".'
    });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password confirmation is required for account deletion.' });
  }

  try {
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Account deletion aborted.' });
    }

    // Cascade delete user data
    const userId = req.user.id;

    // 1. Delete resumes
    await db.query('DELETE FROM resumes WHERE user_id = $1', [userId]);

    // 2. Delete interview sessions & cascade questions/answers/scores
    await db.query('DELETE FROM interview_sessions WHERE user_id = $1', [userId]);

    // 3. Delete coding sessions & attempts
    await db.query('DELETE FROM coding_sessions WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM coding_attempts WHERE user_id = $1', [userId]);

    // 4. Delete aptitude sessions
    await db.query('DELETE FROM aptitude_sessions WHERE user_id = $1', [userId]);

    // 5. Delete campus user memberships & enrollments
    await db.query('DELETE FROM student_enrollments WHERE student_user_id = $1', [userId]);
    await db.query('DELETE FROM batch_tutors WHERE tutor_user_id = $1', [userId]);
    await db.query('DELETE FROM campus_users WHERE user_id = $1', [userId]);

    // 6. Delete consents
    await db.query('DELETE FROM user_consents WHERE user_id = $1', [userId]);

    // 7. Delete main user account
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    // 8. Log deletion audit event
    await db.query(
      'INSERT INTO user_deletion_logs (deleted_user_id, reason) VALUES ($1, $2)',
      [userId, 'User initiated account deletion via GDPR/DPDPA self-service workflow']
    );

    res.json({
      success: true,
      message: 'Account and all associated personal data have been permanently erased.'
    });
  } catch (err) {
    console.error('[privacy/delete-account] Error:', err);
    res.status(500).json({ error: 'Server error during account deletion' });
  }
});

// 6. POST /api/privacy/retention/enforce — Automated Data Retention Enforcement
router.post('/retention/enforce', authenticateToken, loadCampusContext, async (req, res) => {
  // Only administrative roles can invoke manual retention enforcement
  if (req.campusContext?.systemRole !== ROLES.SUPER_ADMIN && req.campusContext?.systemRole !== ROLES.COLLEGE_ADMIN) {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges to execute retention schedule' });
  }

  try {
    // 1. Purge audio recording URLs older than 90 days (retains text transcripts for learning history, deletes biometric voice URLs)
    const audioPurgeRes = await db.query(`
      UPDATE answers
      SET audio_recording_url = NULL
      WHERE created_at < NOW() - INTERVAL '90 days'
        AND audio_recording_url IS NOT NULL
      RETURNING id
    `);

    // 2. Delete abandoned ephemeral sessions older than 30 days
    const abandonedPurgeRes = await db.query(`
      DELETE FROM interview_sessions
      WHERE status = 'IN_PROGRESS'
        AND created_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `);

    const totalPurged = audioPurgeRes.rowCount + abandonedPurgeRes.rowCount;

    // Log the retention execution
    await db.query(`
      INSERT INTO data_retention_logs (action, records_purged, details)
      VALUES ($1, $2, $3)
    `, [
      'SCHEDULED_PURGE',
      totalPurged,
      JSON.stringify({
        audioUrlsCleared: audioPurgeRes.rowCount,
        abandonedSessionsPurged: abandonedPurgeRes.rowCount,
        triggeredBy: req.user.id
      })
    ]);

    res.json({
      success: true,
      recordsPurged: totalPurged,
      audioUrlsCleared: audioPurgeRes.rowCount,
      abandonedSessionsPurged: abandonedPurgeRes.rowCount,
      message: 'Data retention schedule enforced successfully.'
    });
  } catch (err) {
    console.error('[privacy/retention/enforce] Error:', err);
    res.status(500).json({ error: 'Server error enforcing data retention' });
  }
});

export default router;
