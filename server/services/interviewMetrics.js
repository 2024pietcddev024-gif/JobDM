// server/services/interviewMetrics.js
/**
 * Authoritative single source of truth for Interview Metrics across JobDM.
 * Guarantees identical aggregation rules, filters, and scale across Student, Teacher, and HR panels.
 */

import db from '../db.js';

export const COMPLETED_STATUS_FILTER = "status = 'COMPLETED' AND overall_score IS NOT NULL";

/**
 * Returns SQL fragment for counting completed interviews for a given user alias.
 */
export function completedInterviewsSql(userAlias = 'u.id') {
  return `(SELECT COUNT(*)::int FROM interview_sessions WHERE user_id = ${userAlias} AND ${COMPLETED_STATUS_FILTER})`;
}

/**
 * Returns SQL fragment for calculating the average interview score (0-100% scale).
 */
export function avgInterviewScoreSql(userAlias = 'u.id') {
  return `(SELECT ROUND(AVG(overall_score)::numeric, 1) FROM interview_sessions WHERE user_id = ${userAlias} AND ${COMPLETED_STATUS_FILTER})`;
}

/**
 * Returns SQL fragment for practice duration in minutes.
 */
export function totalPracticeMinutesSql(userAlias = 'u.id') {
  return `(SELECT COALESCE(SUM(duration_minutes), 0)::int FROM interview_sessions WHERE user_id = ${userAlias} AND ${COMPLETED_STATUS_FILTER})`;
}

/**
 * Normalizes an interview score to a 0.0 - 100.0 scale.
 * If score is on 1.0-10.0 scale (from LLM rubric), scales by 10.
 */
export function normalizeScore(score) {
  if (score == null) return null;
  const num = parseFloat(score);
  if (isNaN(num)) return null;
  if (num <= 10.0 && num > 0.0) {
    return parseFloat((num * 10).toFixed(1));
  }
  return parseFloat(num.toFixed(1));
}

/**
 * Fetches standardized, consistent student metrics for any single user.
 * Used identically by Student Dashboard, Teacher Student Detail, and HR Candidate views.
 */
export async function getStudentInterviewMetrics(userId) {
  const res = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE ${COMPLETED_STATUS_FILTER})::int as completed_interviews,
      COUNT(*)::int as total_sessions,
      COUNT(*) FILTER (WHERE status = 'ABANDONED')::int as abandoned_sessions,
      ROUND(AVG(overall_score) FILTER (WHERE ${COMPLETED_STATUS_FILTER})::numeric, 1) as avg_score,
      COALESCE(SUM(duration_minutes) FILTER (WHERE ${COMPLETED_STATUS_FILTER}), 0)::int as total_minutes,
      MAX(completed_at) FILTER (WHERE ${COMPLETED_STATUS_FILTER}) as latest_completed_at
    FROM interview_sessions
    WHERE user_id = $1
  `, [userId]);

  const row = res.rows[0] || {};
  return {
    completedInterviews: row.completed_interviews || 0,
    totalSessions: row.total_sessions || 0,
    abandonedSessions: row.abandoned_sessions || 0,
    averageScore: row.avg_score != null ? parseFloat(row.avg_score) : null,
    totalMinutes: row.total_minutes || 0,
    latestCompletedAt: row.latest_completed_at || null
  };
}

export default {
  COMPLETED_STATUS_FILTER,
  completedInterviewsSql,
  avgInterviewScoreSql,
  totalPracticeMinutesSql,
  normalizeScore,
  getStudentInterviewMetrics
};
