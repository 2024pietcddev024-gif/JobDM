import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Search, MapPin, Clock, Calendar, CheckCircle, 
  AlertCircle, ChevronRight, FileText, Send, Building2, 
  ArrowLeft, ExternalLink, Sparkles, UserCheck, XCircle, Loader2,
  HelpCircle, Info, Target, Award, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StudentJobs({ onNavigate }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all_eligible'); // 'all_eligible' | 'recommended' | 'potential' | 'not_eligible' | 'applications'
  
  // Categorized Job Matches
  const [matchData, setMatchData] = useState({
    recommended: [],
    eligible: [],
    potential: [],
    notEligible: [],
    applied: [],
    stats: { totalOpenJobs: 0, eligibleCount: 0, potentialCount: 0, appliedCount: 0 }
  });
  
  const [applications, setApplications] = useState([]);
  const [partnerCompanies, setPartnerCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [applyingJob, setApplyingJob] = useState(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('interviewiq_token');

  const fetchJobsAndApplications = async () => {
    try {
      setLoading(true);
      setError('');

      const [matchRes, appsRes, compRes] = await Promise.all([
        fetch(`${API_URL}/campus/jobs/eligible`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/campus/applications/my`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/campus/partner-companies`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (matchRes.ok) {
        const data = await matchRes.json();
        setMatchData({
          recommended: data.recommended || [],
          eligible: data.eligible || [],
          potential: data.potential || [],
          notEligible: data.notEligible || [],
          applied: data.applied || [],
          stats: data.stats || { totalOpenJobs: 0, eligibleCount: 0, potentialCount: 0, appliedCount: 0 }
        });
      }

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData || []);
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setPartnerCompanies(compData || []);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load jobs and eligibility recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndApplications();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyingJob) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`${API_URL}/campus/jobs/${applyingJob.jobId || applyingJob.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: applyNotes })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.reason || 'Failed to submit application');
      }

      setSuccessMessage(`Successfully applied for ${applyingJob.title}!`);
      setApplyingJob(null);
      setApplyNotes('');
      fetchJobsAndApplications();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (appId) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    try {
      const res = await fetch(`${API_URL}/campus/applications/${appId}/withdraw`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMessage('Application withdrawn.');
        fetchJobsAndApplications();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter jobs based on activeTab
  const getDisplayedJobs = () => {
    let list = [];
    if (activeTab === 'all_eligible') {
      list = [...matchData.recommended, ...matchData.eligible];
    } else if (activeTab === 'recommended') {
      list = matchData.recommended;
    } else if (activeTab === 'potential') {
      list = matchData.potential;
    } else if (activeTab === 'not_eligible') {
      list = matchData.notEligible;
    }
    
    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter(j => 
      j.title?.toLowerCase().includes(q) ||
      j.skills?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      j.collegeName?.toLowerCase().includes(q)
    );
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPLIED':
      case 'NEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Applied</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Under Review</span>;
      case 'SHORTLISTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Shortlisted</span>;
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">Interview Scheduled</span>;
      case 'SELECTED':
      case 'HIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Selected 🎉</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Not Selected</span>;
      case 'WITHDRAWN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">Withdrawn</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const displayedJobs = getDisplayedJobs();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Smart Campus Matching &amp; Placements
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[11px] font-bold">
              {matchData.stats.eligibleCount} Eligible
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
            Eligible Jobs &amp; Opportunities
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
            Automatically matched against your parsed resume skills, verified mock interview performance, and coding practice results.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('all_eligible')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'all_eligible'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" /> All Eligible ({matchData.stats.eligibleCount})
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'recommended'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Recommended ({matchData.recommended.length})
          </button>
          <button
            onClick={() => setActiveTab('potential')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'potential'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Potential ({matchData.potential.length})
          </button>
          <button
            onClick={() => setActiveTab('not_eligible')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'not_eligible'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Ineligible ({matchData.notEligible.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'applications'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> My Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'companies'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-500" /> Approved Partners ({partnerCompanies.length})
          </button>
        </div>
      </div>

      {/* Rationale Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>Transparent Matching:</strong> Job suitability scores (0-100%) represent algorithmic relevance to required skills, resume keywords, and practice performance. They are decision-support recommendations, not automatic hiring guarantees.
        </span>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : activeTab === 'companies' ? (
        /* APPROVED PARTNER COMPANIES DIRECTORY */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                College-Approved Corporate Partners &amp; Hiring Network
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These companies are officially verified and approved by your college admin for campus placement drives.
              </p>
            </div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {partnerCompanies.length} Approved Corporate Partners
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerCompanies.map((c) => {
              const drives = c.drives || [];
              return (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-amber-500/40 shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center font-extrabold text-amber-500 text-lg shadow-sm shrink-0">
                          {c.company_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                              {c.company_name}
                            </h3>
                            {c.website && (
                              <a
                                href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-amber-500 transition-colors"
                                title="Visit company website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{c.industry || 'Technology & Engineering'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> College Approved
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          c.tier === 'TIER_1' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' :
                          c.tier === 'TIER_2' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {c.tier?.replace('_', ' ') || 'STARTUP'}
                        </span>
                      </div>
                    </div>

                    {c.notes && (
                      <p className="text-xs text-slate-500 italic mt-3 bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                        "{c.notes}"
                      </p>
                    )}
                  </div>

                  {/* Active Campus Drives List */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Campus Placement Drives ({drives.length})</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {drives.length > 0 ? 'Accepting Applications' : 'Drive in Preparation'}
                      </span>
                    </div>

                    {drives.length > 0 ? (
                      <div className="space-y-2">
                        {drives.map((drive) => (
                          <div
                            key={drive.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{drive.title}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span>{drive.target_domain?.replace('_', ' ') || drive.job_type || 'Campus Placement'}</span>
                                <span>• {drive.location || 'Campus / Hybrid'}</span>
                                {drive.skills && <span className="truncate max-w-[150px]">• {drive.skills}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const found = [...matchData.recommended, ...matchData.eligible, ...matchData.potential, ...matchData.notEligible].find(j => j.jobId === drive.id);
                                if (found) {
                                  setApplyingJob(found);
                                } else {
                                  setApplyingJob({ jobId: drive.id, id: drive.id, title: drive.title, companyName: c.company_name });
                                }
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm shrink-0 flex items-center justify-center gap-1 transition-colors"
                            >
                              <span>Apply Now</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-white/[0.02] rounded-xl">
                        Official hiring partner verified. New campus drive schedule will be published shortly.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {partnerCompanies.length === 0 && (
              <div className="p-12 text-center text-slate-500 col-span-2">
                <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                <p className="font-semibold">No approved partner companies found for your college yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'applications' ? (
        /* MY APPLICATIONS */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Application History &amp; Status Tracking
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {applications.map((app) => (
                <div key={app.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {app.job_title}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        <Building2 className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                        {app.company_name || app.college_name}
                      </span>
                      {app.company_name && app.college_name && app.company_name !== app.college_name && (
                        <span className="text-slate-400">via {app.college_name}</span>
                      )}
                      <span><MapPin className="w-3.5 h-3.5 inline mr-1" />{app.job_location}</span>
                      <span><Calendar className="w-3.5 h-3.5 inline mr-1" />Applied on {new Date(app.created_at).toLocaleDateString()}</span>
                    </p>

                    {/* Scheduled Interview Details if any */}
                    {app.interview_id && (
                      <div className="mt-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>
                          <strong>{app.interview_stage} Interview Scheduled:</strong>{' '}
                          {new Date(app.interview_schedule_time).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    {app.status === 'APPLIED' && (
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {applications.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                  <p className="font-semibold">You have not submitted any job applications yet.</p>
                  <button
                    onClick={() => setActiveTab('all_eligible')}
                    className="mt-3 text-xs font-bold text-amber-600 hover:underline"
                  >
                    Browse eligible positions &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* JOB CARDS LIST FOR ACTIVE CATEGORY */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, required skills, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#080c14] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-xs text-slate-500">
              Showing {displayedJobs.length} position{displayedJobs.length === 1 ? '' : 's'} in this section
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedJobs.map((job) => {
              const isEligible = job.isEligible;
              const hasApplied = !!job.userApplicationStatus;

              return (
                <div
                  key={job.jobId}
                  className={`p-6 rounded-3xl bg-white dark:bg-slate-900/60 border shadow-sm transition-all flex flex-col justify-between ${
                    job.suitabilityScore >= 75
                      ? 'border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-200/50'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div>
                    {/* Header: Title + Match Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                            {job.title}
                          </h3>
                          {job.jobDomain && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {job.jobDomain.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-600" /> 
                            {job.companyName || job.company_name || 'Campus Partner'}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> College Approved
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {job.collegeName}
                          </span>
                        </div>
                      </div>

                      {/* Suitability Score Pill */}
                      <div className="text-right shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                          job.suitabilityScore >= 70
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                            : job.suitabilityScore >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300'
                        }`}>
                          <Sparkles className="w-3 h-3" /> {job.suitabilityScore}% Match
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{job.suitabilityTier?.toLowerCase()} Suitability</p>
                      </div>
                    </div>

                    {/* Match Rationale / Explanation */}
                    {job.rationale && (
                      <div className="my-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
                        <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 text-[11px] mb-0.5">
                          <Target className="w-3 h-3" /> Recommendation Signal:
                        </p>
                        <p className="text-[11px]">{job.rationale}</p>
                      </div>
                    )}

                    {/* Missing Requirements or Warnings if not fully eligible */}
                    {job.missingRequirements && job.missingRequirements.length > 0 && (
                      <div className="my-2 p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-[11px] text-rose-800 dark:text-rose-300">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Mandatory Requirements:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {job.missingRequirements.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 my-2">
                      {job.description || 'Exciting career opportunity at campus partner.'}
                    </p>

                    {/* Required Skills */}
                    {job.skills && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Required Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills.split(',').map((skill, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/50"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Metadata + Action */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {job.location || 'Remote'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {job.experienceLevel || 'Entry Level'}
                      </span>
                      {job.deadline && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" /> Due {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {hasApplied ? (
                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.userApplicationStatus)}
                      </div>
                    ) : isEligible ? (
                      <button
                        onClick={() => setApplyingJob(job)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Apply Now
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed"
                        title={job.reasons?.[0] || 'Requirement not met'}
                      >
                        Not Eligible
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {displayedJobs.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500">
              <Briefcase className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
              <p className="font-semibold text-sm">No positions found in this category.</p>
              <p className="text-xs text-slate-400 mt-1">Check other categories or adjust search query.</p>
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 font-['Outfit']">
              Apply for {applyingJob.title}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Your profile information, verified mock interview score ({applyingJob.interviewScore || 0}%), and parsed resume will be submitted to {applyingJob.collegeName || 'College HR'}.
            </p>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Candidate Profile
                </label>
                <input
                  type="text"
                  disabled
                  value={`${user?.name || 'Student'} (${user?.email || ''})`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Cover Note / Pitch (Optional)
                </label>
                <textarea
                  rows={3}
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  placeholder="Share a brief introduction or highlight relevant skills for this position..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#080c14] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
