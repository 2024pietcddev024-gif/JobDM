// server/services/jobMatcher.js
/**
 * Smart Job Matching & Eligibility Engine for JobDM.
 * 
 * Separates Hard Eligibility from Suitability Ranking.
 * Stage 1: Deterministic rule-based qualification checks (ELIGIBLE, POTENTIALLY_ELIGIBLE, NOT_ELIGIBLE).
 * Stage 2: Transparent, multi-signal suitability scoring (0-100%) with human-readable rationale.
 */

import { getStudentInterviewMetrics } from './interviewMetrics.js';

/**
 * Normalizes an array or comma-separated list of skills into clean lowercase tokens.
 */
export function normalizeSkills(skillsInput) {
  if (!skillsInput) return [];
  if (Array.isArray(skillsInput)) {
    return skillsInput.map(s => String(s).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof skillsInput === 'string') {
    // Handle JSON string or comma-separated string
    if (skillsInput.startsWith('[') && skillsInput.endsWith(']')) {
      try {
        const parsed = JSON.parse(skillsInput);
        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim().toLowerCase()).filter(Boolean);
      } catch (e) {}
    }
    return skillsInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

/**
 * Infers or standardizes the technical domain of a job post.
 */
export function inferJobDomain(job) {
  if (job.target_domain && job.target_domain.trim()) {
    return job.target_domain.toLowerCase().trim();
  }
  const text = `${job.title || ''} ${job.description || ''} ${job.skills || ''}`.toLowerCase();
  if (text.includes('frontend') || text.includes('react') || text.includes('vue') || text.includes('angular') || text.includes('ui') || text.includes('html')) {
    return 'frontend';
  }
  if (text.includes('backend') || text.includes('node') || text.includes('express') || text.includes('django') || text.includes('spring') || text.includes('java') || text.includes('sql') || text.includes('api')) {
    return 'backend';
  }
  if (text.includes('data') || text.includes('machine learning') || text.includes('ai') || text.includes('pandas') || text.includes('pytorch') || text.includes('tensorflow') || text.includes('analyst')) {
    return 'data_science';
  }
  if (text.includes('devops') || text.includes('cloud') || text.includes('docker') || text.includes('kubernetes') || text.includes('aws') || text.includes('ci/cd')) {
    return 'devops';
  }
  if (text.includes('mobile') || text.includes('android') || text.includes('flutter') || text.includes('react native') || text.includes('ios')) {
    return 'mobile';
  }
  return 'fullstack';
}

/**
 * Stage 1: Deterministic Hard Eligibility Evaluation with Domain & Practice Verification.
 * 
 * Returns {
 *   isEligible: boolean,
 *   status: 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'ALREADY_APPLIED',
 *   reasons: string[],
 *   missingRequirements: string[],
 *   jobDomain: string
 * }
 */
export function evaluateHardEligibility(job, candidateContext) {
  const reasons = [];
  const missingRequirements = [];
  let isPotentiallyEligible = false;
  let isNotEligible = false;
  const jobDomain = inferJobDomain(job);

  // 1. Check if already applied
  if (candidateContext.hasApplied) {
    return {
      isEligible: false,
      status: 'ALREADY_APPLIED',
      reasons: ['You have already applied for this position.'],
      missingRequirements: [],
      jobDomain
    };
  }

  // 2. Job Status Check
  if (job.status && job.status.toUpperCase() !== 'OPEN') {
    return {
      isEligible: false,
      status: 'NOT_ELIGIBLE',
      reasons: ['This job post is currently closed or unlisted by the recruiter.'],
      missingRequirements: ['Job opening inactive'],
      jobDomain
    };
  }

  // 3. Application Deadline Check
  if (job.deadline) {
    const deadlineDate = new Date(job.deadline);
    if (!isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
      return {
        isEligible: false,
        status: 'NOT_ELIGIBLE',
        reasons: [`Application deadline passed on ${deadlineDate.toLocaleDateString()}.`],
        missingRequirements: ['Application deadline expired'],
        jobDomain
      };
    }
  }

  // 4. College / Institutional Scope Check
  if (job.college_id && candidateContext.collegeId) {
    if (String(job.college_id) !== String(candidateContext.collegeId)) {
      return {
        isEligible: false,
        status: 'NOT_ELIGIBLE',
        reasons: ['Position is restricted to students of another partner institution.'],
        missingRequirements: ['Institution eligibility requirement'],
        jobDomain
      };
    }
  }

  // 5. Minimum Interview Score Threshold (if configured by HR)
  if (job.min_interview_score != null && parseFloat(job.min_interview_score) > 0) {
    const minScore = parseFloat(job.min_interview_score);
    const candidateScore = candidateContext.interviewScore;

    if (candidateScore == null) {
      isPotentiallyEligible = true;
      reasons.push(`Requires verified AI mock interview score of at least ${minScore}%.`);
      missingRequirements.push('Take an AI mock interview to verify qualification score');
    } else if (candidateScore < minScore) {
      isNotEligible = true;
      reasons.push(`Minimum AI mock interview score of ${minScore}% required (current: ${candidateScore}%).`);
      missingRequirements.push(`Score threshold not met (${candidateScore}% / ${minScore}%)`);
    }
  }

  // 6. Minimum Coding Problems Solved Threshold (if configured by HR)
  if (job.min_coding_solved != null && parseInt(job.min_coding_solved, 10) > 0) {
    const minSolved = parseInt(job.min_coding_solved, 10);
    const candidateSolved = candidateContext.codingSolved || 0;

    if (candidateSolved < minSolved) {
      isNotEligible = true;
      reasons.push(`Minimum ${minSolved} coding problems solved required (currently solved: ${candidateSolved}).`);
      missingRequirements.push(`Solve ${minSolved - candidateSolved} more coding practice problems`);
    }
  }

  // 7. Domain Alignment & Resume Skill Overlap Check
  const jobReqSkills = normalizeSkills(job.skills);
  const candidateSkills = new Set(normalizeSkills(candidateContext.skills));

  // Extract candidate's practiced domains
  const candidateDomains = new Set();
  if (Array.isArray(candidateContext.practicedDomains)) {
    for (const d of candidateContext.practicedDomains) {
      if (d && d.domain) candidateDomains.add(d.domain.toLowerCase());
    }
  }
  if (candidateContext.topDomain) {
    candidateDomains.add(candidateContext.topDomain.toLowerCase());
  }

  // Check matching skills
  let matchedSkillsCount = 0;
  if (jobReqSkills.length > 0) {
    matchedSkillsCount = jobReqSkills.filter(s => candidateSkills.has(s)).length;
  }

  // Check if candidate has practiced in this domain
  const hasDomainPractice = candidateDomains.has(jobDomain) ||
    (jobDomain === 'fullstack' && (candidateDomains.has('frontend') || candidateDomains.has('backend'))) ||
    (jobDomain === 'frontend' && candidateDomains.has('fullstack')) ||
    (jobDomain === 'backend' && candidateDomains.has('fullstack'));

  // Strict domain and resume matching rule requested by user:
  // If job has required skills and candidate has 0 matched resume skills AND has no practice in this domain:
  if (jobReqSkills.length > 0 && matchedSkillsCount === 0 && !hasDomainPractice) {
    isNotEligible = true;
    reasons.push(
      `Domain & Skill Mismatch: This opening requires ${job.title} skills (${jobReqSkills.slice(0, 3).join(', ')}). Your resume and mock interview practice do not show activity in the ${jobDomain} domain.`
    );
    missingRequirements.push(`Practice mock interviews in ${jobDomain} domain or add matching skills (${jobReqSkills.slice(0, 2).join(', ')}) to your resume`);
  } else if (jobReqSkills.length > 0 && matchedSkillsCount === 0 && hasDomainPractice) {
    // Has practice in domain, but resume lacks the explicit keywords
    isPotentiallyEligible = true;
    reasons.push(
      `Practice Verified in ${jobDomain}: You have mock interview practice in this domain, but your resume lacks the specific required skills (${jobReqSkills.slice(0, 3).join(', ')}).`
    );
    missingRequirements.push(`Add verified skills (${jobReqSkills.slice(0, 3).join(', ')}) to your resume`);
  }

  // Final Hard Eligibility Determination
  if (isNotEligible) {
    return {
      isEligible: false,
      status: 'NOT_ELIGIBLE',
      reasons,
      missingRequirements,
      jobDomain
    };
  }

  if (isPotentiallyEligible) {
    return {
      isEligible: false,
      status: 'POTENTIALLY_ELIGIBLE',
      reasons,
      missingRequirements,
      jobDomain
    };
  }

  return {
    isEligible: true,
    status: 'ELIGIBLE',
    reasons: ['All mandatory job requirements, resume skills, and domain qualifications satisfied.'],
    missingRequirements: [],
    jobDomain
  };
}

/**
 * Stage 2: Transparent Suitability Ranking (0 - 100%).
 * 
 * Computes transparent match score based on:
 * - Required skill overlap (40%)
 * - Preferred skill overlap (15%)
 * - Role alignment (15%)
 * - AI Mock Interview performance (15%)
 * - Coding practice performance (15%)
 */
export function calculateSuitabilityScore(job, candidateContext) {
  const jobReqSkills = normalizeSkills(job.skills);
  const jobPrefSkills = normalizeSkills(job.preferred_skills);
  const candidateSkills = new Set(normalizeSkills(candidateContext.skills));

  // 1. Required Skills Score (Max 40 points)
  let reqSkillScore = 0;
  let matchedReqSkills = [];
  if (jobReqSkills.length > 0) {
    matchedReqSkills = jobReqSkills.filter(s => candidateSkills.has(s));
    reqSkillScore = (matchedReqSkills.length / jobReqSkills.length) * 40;
  } else {
    // If no specific required skills listed, give baseline score
    reqSkillScore = 30;
  }

  // 2. Preferred Skills Score (Max 15 points)
  let prefSkillScore = 0;
  let matchedPrefSkills = [];
  if (jobPrefSkills.length > 0) {
    matchedPrefSkills = jobPrefSkills.filter(s => candidateSkills.has(s));
    prefSkillScore = (matchedPrefSkills.length / jobPrefSkills.length) * 15;
  } else {
    prefSkillScore = 10;
  }

  // 3. Role Alignment Score (Max 15 points)
  let roleScore = 8; // baseline
  if (candidateContext.targetRole && job.title) {
    const cRole = candidateContext.targetRole.toLowerCase();
    const jTitle = job.title.toLowerCase();
    if (jTitle.includes(cRole) || cRole.includes(jTitle)) {
      roleScore = 15;
    } else {
      const words = cRole.split(/\s+/).filter(w => w.length > 2);
      const matchWords = words.filter(w => jTitle.includes(w));
      if (matchWords.length > 0) roleScore = 12;
    }
  }

  // 4. Interview Performance & Domain Practice Score (Max 20 points)
  let interviewScorePart = 8;
  if (candidateContext.interviewScore != null) {
    // Map 0-100% score to 0-15 points
    interviewScorePart = Math.min(15, (candidateContext.interviewScore / 100) * 15);
  }

  // Domain practice alignment check
  const jobDomain = inferJobDomain(job);
  let domainPracticeBonus = 0;
  let domainPracticeCount = 0;

  if (Array.isArray(candidateContext.practicedDomains)) {
    for (const d of candidateContext.practicedDomains) {
      if (d && d.domain && (d.domain.includes(jobDomain) || jobDomain.includes(d.domain) || (jobDomain === 'fullstack' && (d.domain.includes('frontend') || d.domain.includes('backend'))))) {
        domainPracticeCount += parseInt(d.count || 1, 10);
      }
    }
  }

  if (domainPracticeCount > 0) {
    domainPracticeBonus = Math.min(10, 5 + domainPracticeCount * 2);
  }

  // 5. Coding Practice Score (Max 15 points)
  let codingScorePart = 5;
  const solved = candidateContext.codingSolved || 0;
  if (solved >= 10) codingScorePart = 15;
  else if (solved >= 5) codingScorePart = 12;
  else if (solved >= 1) codingScorePart = 8;

  const totalScore = Math.min(100, Math.round(reqSkillScore + prefSkillScore + roleScore + interviewScorePart + domainPracticeBonus + codingScorePart));

  let tier = 'BASIC';
  if (totalScore >= 80) tier = 'HIGH';
  else if (totalScore >= 65) tier = 'GOOD';
  else if (totalScore >= 50) tier = 'MODERATE';

  // Generate transparent explanation
  const explanations = [];
  if (matchedReqSkills.length > 0) {
    explanations.push(`Matched ${matchedReqSkills.length}/${jobReqSkills.length} required resume skills (${matchedReqSkills.slice(0, 3).join(', ')})`);
  }
  if (domainPracticeCount > 0) {
    explanations.push(`${domainPracticeCount} completed mock interview(s) in ${jobDomain} domain`);
  }
  if (matchedPrefSkills.length > 0) {
    explanations.push(`Possesses preferred skills (${matchedPrefSkills.slice(0, 2).join(', ')})`);
  }
  if (candidateContext.interviewScore != null && candidateContext.interviewScore >= 75) {
    explanations.push(`Verified strong AI mock interview rating (${candidateContext.interviewScore}%)`);
  }
  if (solved >= 1) {
    explanations.push(`${solved} solved coding practice problem(s)`);
  }

  const rationale = explanations.length > 0 
    ? `${totalScore}% Match: ` + explanations.join('; ') + '.'
    : `${totalScore}% Match based on campus profile and domain alignment.`;

  return {
    score: totalScore,
    tier,
    matchedSkills: matchedReqSkills,
    jobDomain,
    domainPracticeCount,
    rationale
  };
}

/**
 * Evaluates a single job against a candidate and returns full decision payload.
 */
export function evaluateJobMatch(job, candidateContext) {
  const hardEval = evaluateHardEligibility(job, candidateContext);
  const suitability = calculateSuitabilityScore(job, candidateContext);

  let recommendationSection = 'not_eligible';
  if (hardEval.status === 'ALREADY_APPLIED') {
    recommendationSection = 'applied';
  } else if (hardEval.status === 'ELIGIBLE') {
    if (suitability.score >= 70) {
      recommendationSection = 'recommended';
    } else {
      recommendationSection = 'eligible';
    }
  } else if (hardEval.status === 'POTENTIALLY_ELIGIBLE') {
    recommendationSection = 'potential';
  } else {
    recommendationSection = 'not_eligible';
  }

  return {
    jobId: job.id,
    id: job.id,
    title: job.title,
    description: job.description,
    skills: job.skills,
    location: job.location,
    jobType: job.job_type,
    workplaceType: job.workplace_type,
    experienceLevel: job.experience_level,
    deadline: job.deadline,
    collegeName: job.college_name,
    job,
    jobDomain: hardEval.jobDomain,
    eligibilityStatus: hardEval.status,
    isEligible: hardEval.isEligible,
    recommendationSection,
    matchScore: suitability.score,
    suitabilityScore: suitability.score,
    matchTier: suitability.tier,
    suitabilityTier: suitability.tier,
    matchedSkills: suitability.matchedSkills,
    matchRationale: suitability.rationale,
    rationale: suitability.rationale,
    eligibilityReasons: hardEval.reasons,
    reasons: hardEval.reasons,
    missingRequirements: hardEval.missingRequirements
  };
}

export default {
  normalizeSkills,
  evaluateHardEligibility,
  calculateSuitabilityScore,
  evaluateJobMatch
};
