import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, Users, LayoutDashboard, ShieldCheck, 
  XCircle, Loader2, User as UserIcon, Search,
  TrendingUp, Calendar, CheckCircle, Activity,
  PlayCircle, Brain, Target, History, Plus, 
  FileText, Building2, BarChart3, Settings, Edit2,
  Trash2, ExternalLink, Clock, ChevronRight, X,
  Award, Sparkles, AlertCircle, ArrowUpRight, Check,
  Filter, Phone, Mail, MapPin, Copy
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell 
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fetchApi = async (path, method = 'GET', body = null) => {
  const token = localStorage.getItem('interviewiq_token');
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  
  const res = await fetch(`${API_URL}/campus/hr${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired. Please log in again.');
    if (res.status === 403) throw new Error('You do not have HR access privileges.');
    if (res.status === 404) throw new Error('HR API Endpoint not found.');
    throw new Error(data?.error || 'Unable to load data. Please try again.');
  }
  return data;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function HRDashboard({ initialTab = 'overview', onNavigate }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Synchronize activeTab with prop changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);

  // Search & Filter states
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('All');
  const [candidateJobFilter, setCandidateJobFilter] = useState('');
  
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('All');

  const [interviewStatusFilter, setInterviewStatusFilter] = useState('All');

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [authorizedColleges, setAuthorizedColleges] = useState([]);
  const [jobForm, setJobForm] = useState({
    college_id: '',
    target_domain: 'fullstack',
    title: '',
    description: '',
    skills: '',
    preferred_skills: '',
    required_degree: '',
    min_cgpa: '',
    min_interview_score: '',
    min_coding_solved: '',
    experience_level: 'Entry Level',
    location: 'Remote',
    job_type: 'Full Time',
    workplace_type: 'Remote',
    deadline: ''
  });

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingCandidateDetails, setLoadingCandidateDetails] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetApp, setScheduleTargetApp] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    application_id: '',
    schedule_time: '',
    type: 'Technical',
    stage: 'Technical Round'
  });

  const [copiedId, setCopiedId] = useState(false);

  const isHrAuthorized = useMemo(() => {
    return user?.campus?.role === 'HR' || user?.campusContext?.role === 'HR' || user?.role === 'HR';
  }, [user]);

  useEffect(() => {
    if (isHrAuthorized) {
      loadTabData(activeTab);
    } else {
      setError('Unauthorized: Your account does not have HR privileges.');
    }
  }, [activeTab, isHrAuthorized]);

  const loadTabData = async (tab) => {
    try {
      setLoading(true);
      setError('');
      if (tab === 'overview') {
        const data = await fetchApi('/overview');
        setOverviewData(data);
      } else if (tab === 'candidates') {
        const data = await fetchApi('/candidates');
        setCandidates(data || []);
      } else if (tab === 'jobs') {
        const data = await fetchApi('/jobs');
        setJobs(data || []);
      } else if (tab === 'interviews') {
        const data = await fetchApi('/interviews');
        setInterviews(data || []);
      } else if (tab === 'analytics') {
        const data = await fetchApi('/analytics');
        setAnalytics(data);
      } else if (tab === 'profile') {
        const data = await fetchApi('/profile');
        setProfile(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Job CRUD Handlers
  const handleOpenJobModal = async (job = null) => {
    try {
      const colData = await fetchApi('/authorized-colleges');
      setAuthorizedColleges(colData || []);
      if (colData && colData.length > 0 && !job) {
        setJobForm(prev => ({ ...prev, college_id: colData[0].id }));
      }
    } catch (e) {
      console.warn('Could not load authorized colleges:', e);
    }

    if (job) {
      setEditingJob(job);
      setJobForm({
        title: job.title || '',
        description: job.description || '',
        skills: job.skills || '',
        preferred_skills: job.preferred_skills || '',
        required_degree: job.required_degree || '',
        min_cgpa: job.min_cgpa != null ? job.min_cgpa : '',
        min_interview_score: job.min_interview_score != null ? job.min_interview_score : '',
        min_coding_solved: job.min_coding_solved != null ? job.min_coding_solved : '',
        experience_level: job.experience_level || 'Entry Level',
        location: job.location || 'Remote',
        job_type: job.job_type || 'Full Time',
        workplace_type: job.workplace_type || 'Remote',
        deadline: job.deadline ? job.deadline.split('T')[0] : ''
      });
    } else {
      setEditingJob(null);
      setJobForm({
        title: '',
        description: '',
        skills: '',
        preferred_skills: '',
        required_degree: '',
        min_cgpa: '',
        min_interview_score: '',
        min_coding_solved: '',
        experience_level: 'Entry Level',
        location: 'Remote',
        job_type: 'Full Time',
        workplace_type: 'Remote',
        deadline: ''
      });
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      setError('Please provide a job title');
      return;
    }
    try {
      setLoading(true);
      setError('');
      if (editingJob) {
        await fetchApi(`/jobs/${editingJob.id}`, 'PATCH', jobForm);
        setSuccess('Job posting updated successfully!');
      } else {
        await fetchApi('/jobs', 'POST', jobForm);
        setSuccess('Job posting created successfully!');
      }
      setIsJobModalOpen(false);
      loadTabData('jobs');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJobStatus = async (job) => {
    const nextStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await fetchApi(`/jobs/${job.id}`, 'PATCH', { status: nextStatus });
      setSuccess(`Job marked as ${nextStatus}!`);
      loadTabData('jobs');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Candidate Details & Status Transition
  const handleViewCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    try {
      setLoadingCandidateDetails(true);
      const details = await fetchApi(`/candidates/${candidate.candidate_id}`);
      setCandidateDetails(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCandidateDetails(false);
    }
  };

  const handleUpdateCandidateStatus = async (applicationId, newStatus) => {
    try {
      await fetchApi(`/applications/${applicationId}/status`, 'PATCH', { status: newStatus });
      setSuccess(`Application status transitioned to ${newStatus}`);
      if (selectedCandidate) {
        setSelectedCandidate(prev => ({ ...prev, status: newStatus }));
      }
      loadTabData(activeTab);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Schedule Interview Handlers
  const handleOpenScheduleModal = (candidateOrApp = null) => {
    if (candidateOrApp) {
      setScheduleTargetApp(candidateOrApp);
      setScheduleForm({
        application_id: candidateOrApp.application_id || candidateOrApp.id,
        schedule_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        type: 'Technical',
        stage: 'Technical Round 1'
      });
    } else {
      setScheduleTargetApp(null);
      setScheduleForm({
        application_id: candidates[0]?.application_id || '',
        schedule_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        type: 'Technical',
        stage: 'Technical Round 1'
      });
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveInterviewSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.application_id || !scheduleForm.schedule_time) {
      setError('Please select application and schedule date/time');
      return;
    }
    try {
      setLoading(true);
      await fetchApi('/interviews', 'POST', scheduleForm);
      setSuccess('Interview scheduled successfully! Candidate notified.');
      setIsScheduleModalOpen(false);
      if (selectedCandidate) {
        setSelectedCandidate(prev => ({ ...prev, status: 'INTERVIEW_SCHEDULED' }));
      }
      loadTabData(activeTab);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInterviewStatus = async (interviewId, newStatus) => {
    try {
      await fetchApi(`/interviews/${interviewId}`, 'PATCH', { status: newStatus });
      setSuccess(`Interview marked as ${newStatus}`);
      loadTabData('interviews');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Filtering
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = !candidateSearch || 
        c.name?.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        c.applied_for?.toLowerCase().includes(candidateSearch.toLowerCase());
      
      const matchStatus = candidateStatusFilter === 'All' || 
        c.status?.toUpperCase() === candidateStatusFilter.toUpperCase();

      const matchJob = !candidateJobFilter || c.job_id === candidateJobFilter;

      return matchSearch && matchStatus && matchJob;
    });
  }, [candidates, candidateSearch, candidateStatusFilter, candidateJobFilter]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !jobSearch ||
        j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.skills?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.location?.toLowerCase().includes(jobSearch.toLowerCase());

      const matchStatus = jobStatusFilter === 'All' ||
        j.status?.toUpperCase() === jobStatusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [jobs, jobSearch, jobStatusFilter]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter(i => {
      if (interviewStatusFilter === 'All') return true;
      return i.status?.toUpperCase() === interviewStatusFilter.toUpperCase();
    });
  }, [interviews, interviewStatusFilter]);

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPLIED':
      case 'NEW':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'SHORTLISTED':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'INTERVIEW_SCHEDULED':
      case 'SCHEDULED':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'SELECTED':
      case 'HIRED':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  if (!isHrAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Unauthorized HR Access</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Your current account does not have corporate HR administrator privileges.
        </p>
        <p className="text-sm text-slate-500 mt-3 max-w-md text-center">
          Please log in using your HR Portal Credentials (e.g. HR-piet24cd-NUEN0K) and institutional College Code.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-indigo-500/10 p-6 rounded-3xl border border-amber-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                HR Talent Portal
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Campus Recruitment
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                Managing talent pipeline, job listings, candidate evaluations, and recruitment interviews.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenJobModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/25 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" /> Post New Job
          </button>
          <button
            onClick={() => handleOpenScheduleModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all"
          >
            <Calendar className="w-4 h-4 text-purple-600" /> Schedule Interview
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
          { id: 'jobs', icon: Briefcase, label: 'Job Postings' },
          { id: 'candidates', icon: Users, label: 'Candidate Pipeline' },
          { id: 'interviews', icon: Calendar, label: 'Interviews' },
          { id: 'analytics', icon: BarChart3, label: 'Recruitment Analytics' },
          { id: 'profile', icon: Settings, label: 'HR Profile & Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (onNavigate) {
                const navMap = {
                  overview: 'hr-dashboard',
                  jobs: 'hr-jobs',
                  candidates: 'hr-candidates',
                  interviews: 'hr-interviews',
                  analytics: 'hr-analytics',
                  profile: 'hr-profile'
                };
                onNavigate(navMap[tab.id] || 'hr-dashboard');
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === tab.id 
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600 shadow-sm' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-bold">Operation Notice</p>
            <p className="text-xs mt-0.5 font-medium">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          <div className="flex-1">
            <p className="text-sm font-bold">Success</p>
            <p className="text-xs mt-0.5 font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading && !overviewData && activeTab === 'overview' ? (
        <div className="p-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-slate-500">Loading HR Workspace...</p>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. OVERVIEW TAB (Prototype Reference Step 2) */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric Cards matching prototype: Total Jobs, Applications, Shortlisted, Interviews */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Jobs - Indigo */}
                <div 
                  onClick={() => setActiveTab('jobs')}
                  className="cursor-pointer p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Jobs</p>
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {overviewData?.totalJobs ?? 0}
                  </h3>
                  <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 font-medium mt-1 flex items-center gap-1">
                    Active listings for campus <ArrowUpRight className="w-3 h-3" />
                  </p>
                </div>

                {/* Total Applications - Emerald */}
                <div 
                  onClick={() => setActiveTab('candidates')}
                  className="cursor-pointer p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Applications</p>
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {overviewData?.totalApplications ?? 0}
                  </h3>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1 flex items-center gap-1">
                    Student applications received <ArrowUpRight className="w-3 h-3" />
                  </p>
                </div>

                {/* Shortlisted Candidates - Amber */}
                <div 
                  onClick={() => {
                    setCandidateStatusFilter('SHORTLISTED');
                    setActiveTab('candidates');
                  }}
                  className="cursor-pointer p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Shortlisted</p>
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {overviewData?.shortlisted ?? 0}
                  </h3>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium mt-1 flex items-center gap-1">
                    Qualified for next round <ArrowUpRight className="w-3 h-3" />
                  </p>
                </div>

                {/* Scheduled Interviews - Purple */}
                <div 
                  onClick={() => setActiveTab('interviews')}
                  className="cursor-pointer p-5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Interviews</p>
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {overviewData?.interviewsScheduled ?? 0}
                  </h3>
                  <p className="text-xs text-purple-600/80 dark:text-purple-400/80 font-medium mt-1 flex items-center gap-1">
                    Scheduled on calendar <ArrowUpRight className="w-3 h-3" />
                  </p>
                </div>
              </div>

              {/* Recent Applications Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-600" /> Recent Applications
                    </h3>
                    <p className="text-xs text-slate-500">Latest applicant submissions across all college positions</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('candidates')}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    View All Candidates <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {(!overviewData?.recentApplications || overviewData.recentApplications.length === 0) ? (
                  <div className="p-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                    <p className="font-semibold">No recent applications submitted yet.</p>
                    <p className="text-xs mt-1">Student submissions will appear here once candidates apply.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-4">Candidate</th>
                          <th className="py-3 px-4">Job Title</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Applied Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {overviewData.recentApplications.map((app) => (
                          <tr key={app.application_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                                  {app.candidate_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">{app.candidate_name}</p>
                                  <p className="text-xs text-slate-500">{app.candidate_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {app.job_title}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {app.job_type || 'Full Time'} • {app.workplace_type || 'Remote'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 font-medium">
                              {formatDate(app.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusBadge(app.status)}`}>
                                {app.status || 'APPLIED'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleViewCandidate({
                                  ...app,
                                  name: app.candidate_name,
                                  email: app.candidate_email,
                                  applied_for: app.job_title
                                })}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs transition-colors"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. JOBS MANAGEMENT TAB (Prototype Reference Step 3) */}
          {/* ========================================================= */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              {/* Controls bar: Search, Filter, + Create Job Post */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search job title, skills, location..." 
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-amber-500 outline-none text-slate-800 dark:text-slate-100 shadow-sm"
                    />
                  </div>
                  <select
                    value={jobStatusFilter}
                    onChange={(e) => setJobStatusFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none shadow-sm"
                  >
                    <option value="All">All Statuses</option>
                    <option value="OPEN">Open (Active)</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <button 
                  onClick={() => handleOpenJobModal()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Create Job Post
                </button>
              </div>

              {/* Job Cards Grid */}
              {filteredJobs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800">
                  <Briefcase className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                  <p className="font-bold text-base text-slate-800 dark:text-slate-200">No Job Postings Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Create new positions to start receiving applications from college students.
                  </p>
                  <button
                    onClick={() => handleOpenJobModal()}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    Post First Job
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredJobs.map((job) => (
                    <div 
                      key={job.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Title and Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                            {job.title}
                          </h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            job.status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {job.status || 'OPEN'}
                          </span>
                        </div>

                        {/* Badges: Workplace, Job Type, Location */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200 dark:border-amber-800">
                            {job.job_type || 'Full Time'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800">
                            {job.workplace_type || 'Remote'}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" /> {job.location || 'Remote'}
                          </span>
                        </div>

                        {/* Description snippet */}
                        {job.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                            {job.description}
                          </p>
                        )}

                        {/* Skills */}
                        {job.skills && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {job.skills.split(',').map((skill, idx) => (
                              <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        {/* Metrics Bar: Applications & Shortlisted counts */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-center mb-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500">Applicants</p>
                            <p className="text-base font-black text-slate-900 dark:text-white">
                              {job.applications_count || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Shortlisted</p>
                            <p className="text-base font-black text-amber-600 dark:text-amber-400">
                              {job.shortlisted_count || 0}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <button
                            onClick={() => {
                              setCandidateJobFilter(job.id);
                              setActiveTab('candidates');
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold transition-colors text-center"
                          >
                            View Applicants
                          </button>
                          <button
                            onClick={() => handleOpenJobModal(job)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            title="Edit Job"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleJobStatus(job)}
                            className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                              job.status === 'OPEN'
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                            title={job.status === 'OPEN' ? 'Close Job' : 'Reopen Job'}
                          >
                            {job.status === 'OPEN' ? 'Close' : 'Reopen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. CANDIDATES PIPELINE TAB (Prototype Reference Step 4) */}
          {/* ========================================================= */}
          {activeTab === 'candidates' && (
            <div className="space-y-6">
              {/* Status Filter Tabs matching prototype: All, New, Shortlisted, Interview, Selected, Rejected */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { id: 'All', label: 'All Candidates' },
                    { id: 'APPLIED', label: 'New / Applied' },
                    { id: 'SHORTLISTED', label: 'Shortlisted' },
                    { id: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
                    { id: 'SELECTED', label: 'Selected / Hired' },
                    { id: 'REJECTED', label: 'Rejected' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setCandidateStatusFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        candidateStatusFilter === filter.id
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {candidateJobFilter && (
                  <button
                    onClick={() => setCandidateJobFilter('')}
                    className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 hover:underline"
                  >
                    Clear Job Filter <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Search input */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search candidate by name, email, role..." 
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-amber-500 outline-none text-slate-800 dark:text-slate-100 shadow-sm"
                />
              </div>

              {/* Candidates Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {filteredCandidates.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                    <p className="font-bold text-base text-slate-800 dark:text-slate-200">No Candidates Found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                          <th className="py-3.5 px-4">Candidate</th>
                          <th className="py-3.5 px-4">Applied Job</th>
                          <th className="py-3.5 px-4">AI Score</th>
                          <th className="py-3.5 px-4">Coding Solved</th>
                          <th className="py-3.5 px-4">Applied Date</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCandidates.map((candidate) => (
                          <tr key={candidate.application_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                  {candidate.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">{candidate.name}</p>
                                  <p className="text-xs text-slate-500">{candidate.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {candidate.applied_for || 'General'}
                              {candidate.location && (
                                <p className="text-xs text-slate-400 font-normal">{candidate.location}</p>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {candidate.avg_interview_score ? (
                                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                                  candidate.avg_interview_score >= 80 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                }`}>
                                  {candidate.avg_interview_score}% AI Score
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No AI Mock Yet</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {candidate.coding_solved !== undefined ? (
                                <span className="flex items-center gap-1">
                                  <Code className="w-3.5 h-3.5 text-indigo-500" /> {candidate.coding_solved} Problems
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                              {formatDate(candidate.applied_at)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusBadge(candidate.status)}`}>
                                {candidate.status || 'APPLIED'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleViewCandidate(candidate)}
                                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. INTERVIEWS MANAGEMENT TAB (Prototype Reference Step 5) */}
          {/* ========================================================= */}
          {activeTab === 'interviews' && (
            <div className="space-y-6">
              {/* Header with filter tabs and + Schedule Interview button */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { id: 'All', label: 'All Interviews' },
                    { id: 'SCHEDULED', label: 'Scheduled' },
                    { id: 'COMPLETED', label: 'Completed' },
                    { id: 'CANCELLED', label: 'Cancelled' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setInterviewStatusFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        interviewStatusFilter === filter.id
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => handleOpenScheduleModal()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Schedule Interview
                </button>
              </div>

              {/* Interviews Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {filteredInterviews.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                    <p className="font-bold text-base text-slate-800 dark:text-slate-200">No Interviews Scheduled</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Schedule technical or HR interviews with shortlisted candidates to evaluate fit.
                    </p>
                    <button
                      onClick={() => handleOpenScheduleModal()}
                      className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      Schedule Interview
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                          <th className="py-3.5 px-4">Candidate</th>
                          <th className="py-3.5 px-4">Role</th>
                          <th className="py-3.5 px-4">Scheduled Date & Time</th>
                          <th className="py-3.5 px-4">Stage / Type</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInterviews.map((intv) => (
                          <tr key={intv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                                  {intv.candidate_name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">{intv.candidate_name}</p>
                                  <p className="text-xs text-slate-500">{intv.candidate_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {intv.job_role || 'General'}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                {formatDateTime(intv.schedule_time)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                                {intv.stage || 'Technical'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusBadge(intv.status)}`}>
                                {intv.status || 'SCHEDULED'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {intv.status === 'SCHEDULED' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleUpdateInterviewStatus(intv.id, 'COMPLETED')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs transition-colors"
                                  >
                                    Mark Done
                                  </button>
                                  <button
                                    onClick={() => handleUpdateInterviewStatus(intv.id, 'CANCELLED')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">No actions</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. RECRUITMENT ANALYTICS TAB (Prototype Reference Step 6) */}
          {/* ========================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Funnel KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Applied</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {analytics?.totalApplications ?? 0}
                  </h3>
                  <p className="text-xs text-indigo-500 font-medium mt-1">100% Top of Funnel</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shortlisted</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {analytics?.shortlisted ?? 0}
                  </h3>
                  <p className="text-xs text-amber-500 font-medium mt-1">
                    {analytics?.totalApplications 
                      ? `${Math.round((analytics.shortlisted / analytics.totalApplications) * 100)}% Conversion`
                      : '0% Conversion'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interviews</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {analytics?.interviews ?? 0}
                  </h3>
                  <p className="text-xs text-purple-500 font-medium mt-1">Scheduled / Conducted</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hired / Selected</p>
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {analytics?.hired ?? 0}
                  </h3>
                  <p className="text-xs text-emerald-500 font-medium mt-1">Recruitment Success</p>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application Trends Line/Area Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" /> Application Trends
                    </h3>
                    <p className="text-xs text-slate-500">Student application volume over the past 30 days</p>
                  </div>
                  
                  {(!analytics?.applicationsTrend || analytics.applicationsTrend.length === 0) ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                      No application trend points recorded yet.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.applicationsTrend}>
                          <defs>
                            <linearGradient id="appColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                          <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              borderColor: '#334155', 
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '12px'
                            }} 
                          />
                          <Area type="monotone" dataKey="applications" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#appColor)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Applications by Role / Department Bar Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" /> Applications by Role
                    </h3>
                    <p className="text-xs text-slate-500">Distribution of talent interest across posted opportunities</p>
                  </div>

                  {(!analytics?.departmentDistribution || analytics.departmentDistribution.length === 0) ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                      No department data points recorded yet.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.departmentDistribution}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                          <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              borderColor: '#334155', 
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '12px'
                            }} 
                          />
                          <Bar dataKey="value" name="Applications" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. HR PROFILE & SETTINGS TAB (Prototype Reference Step 7) */}
          {/* ========================================================= */}
          {activeTab === 'profile' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    {profile?.full_name?.charAt(0) || user?.name?.charAt(0) || 'H'}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {profile?.full_name || user?.name || 'HR Recruiter'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Corporate Campus Recruitment Officer</p>
                    <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Role: {profile?.role || 'HR'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* HR ID */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">HR Login Identifier</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                        {profile?.hr_id || 'HR-piet24cd-NUEN0K'}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(profile?.hr_id || 'HR-piet24cd-NUEN0K');
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded"
                        title="Copy HR ID"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* College Code */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Institution Code</p>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {profile?.college_code || 'piet24cd'}
                    </p>
                  </div>

                  {/* Partner College Name */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Partner Institution</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {profile?.college_name || 'PIET College'}
                    </p>
                  </div>

                  {/* HR Email */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Official Email</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {profile?.email || user?.email || 'hr@jobdm.edu'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Campus Security Boundary Active</p>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      Your HR profile has tenant-level access restricted to verified students and job postings of {profile?.college_name || 'PIET College'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT JOB POST */}
      {/* ========================================================= */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                {editingJob ? 'Edit Job Posting' : 'Post New Campus Job'}
              </h3>
              <button 
                onClick={() => setIsJobModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-4">
              {/* Target Institution Selection (Super-Admin Verified Permissions) */}
              {authorizedColleges.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Target Institution (Authorized Colleges) *
                  </label>
                  <select
                    value={jobForm.college_id}
                    onChange={(e) => setJobForm({ ...jobForm, college_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="">Select Target College</option>
                    {authorizedColleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    🔒 You can only post to institutions where Super Admin has granted you active authorization.
                  </p>
                </div>
              )}

              {/* Target Technical Domain Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Technical Domain Specialization *
                </label>
                <select
                  value={jobForm.target_domain}
                  onChange={(e) => setJobForm({ ...jobForm, target_domain: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="frontend">Frontend Development (React, Vue, Web)</option>
                  <option value="backend">Backend Development (Node, Java, Python, SQL)</option>
                  <option value="fullstack">Full Stack Engineering</option>
                  <option value="data_science">Data Science & AI/ML</option>
                  <option value="devops">DevOps & Cloud Infrastructure (AWS, Docker)</option>
                  <option value="mobile">Mobile App Development (Flutter, React Native)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Used by the Smart Eligibility engine to match candidates based on resume skills and mock interview practice.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Job Title *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Associate Software Engineer, Frontend Intern"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Job Type
                  </label>
                  <select
                    value={jobForm.job_type}
                    onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Full Time">Full Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Workplace Type
                  </label>
                  <select
                    value={jobForm.workplace_type}
                    onChange={(e) => setJobForm({ ...jobForm, workplace_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={jobForm.experience_level}
                    onChange={(e) => setJobForm({ ...jobForm, experience_level: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Location
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Bangalore / Remote"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Required Skills (comma separated) *
                </label>
                <input 
                  type="text"
                  placeholder="e.g. React, Node.js, PostgreSQL, TypeScript"
                  value={jobForm.skills}
                  onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Preferred / Nice-to-Have Skills (comma separated)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Docker, Redis, AWS, GraphQL"
                  value={jobForm.preferred_skills}
                  onChange={(e) => setJobForm({ ...jobForm, preferred_skills: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Required Degree
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. B.Tech / BE"
                    value={jobForm.required_degree}
                    onChange={(e) => setJobForm({ ...jobForm, required_degree: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Min Mock Score (%)
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 60"
                    value={jobForm.min_interview_score}
                    onChange={(e) => setJobForm({ ...jobForm, min_interview_score: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Min Coding Solved
                  </label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={jobForm.min_coding_solved}
                    onChange={(e) => setJobForm({ ...jobForm, min_coding_solved: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Application Deadline
                </label>
                <input 
                  type="date"
                  value={jobForm.deadline}
                  onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Job Description & Qualifications
                </label>
                <textarea 
                  rows={4}
                  placeholder="Describe the responsibilities, project scope, and hiring criteria..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingJob ? 'Save Changes' : 'Create Job Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CANDIDATE DETAILS & ASSESSMENT REPORT */}
      {/* ========================================================= */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {selectedCandidate.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedCandidate.name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedCandidate.email}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    Applied For: {selectedCandidate.applied_for}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedCandidate(null);
                  setCandidateDetails(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingCandidateDetails ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Retrieving Candidate Assessment Portfolio...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Status Transition Action Bar */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Current Status:</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusBadge(selectedCandidate.status)}`}>
                      {selectedCandidate.status || 'APPLIED'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleUpdateCandidateStatus(selectedCandidate.application_id, 'SHORTLISTED')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-colors"
                    >
                      Shortlist
                    </button>
                    <button
                      onClick={() => handleOpenScheduleModal(selectedCandidate)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors"
                    >
                      Schedule Interview
                    </button>
                    <button
                      onClick={() => handleUpdateCandidateStatus(selectedCandidate.application_id, 'SELECTED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                    >
                      Mark Selected
                    </button>
                    <button
                      onClick={() => handleUpdateCandidateStatus(selectedCandidate.application_id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Candidate Readiness KPI Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40">
                    <p className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Target Role</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                      {candidateDetails?.candidate?.target_role || 'Full Stack Dev'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Coding Solved</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                      {candidateDetails?.codingSolved || 0} Problems
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
                    <p className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Practice Streak</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                      {candidateDetails?.candidate?.streak_days || 0} Days
                    </p>
                  </div>
                </div>

                {/* Resume section */}
                {candidateDetails?.resume ? (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {candidateDetails.resume.file_name || 'Candidate Resume'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Uploaded {formatDate(candidateDetails.resume.created_at)}
                        </p>
                      </div>
                    </div>
                    {candidateDetails.resume.file_url && (
                      <a 
                        href={candidateDetails.resume.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                      >
                        View Resume <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                    No verified resume PDF attached to profile yet.
                  </div>
                )}

                {/* AI Mock Interview History */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    Verified AI Mock Interview Sessions
                  </h4>
                  {(!candidateDetails?.interviewHistory || candidateDetails.interviewHistory.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                      No AI mock sessions completed by student yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {candidateDetails.interviewHistory.map((sess) => (
                        <div key={sess.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {sess.role || sess.category || 'Technical Interview'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {sess.difficulty || 'Medium'} • {formatDate(sess.created_at)}
                            </p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-md font-black ${
                            sess.overall_score >= 80 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            Score: {sess.overall_score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SCHEDULE INTERVIEW */}
      {/* ========================================================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Schedule Recruitment Interview
              </h3>
              <button 
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInterviewSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Candidate Application *
                </label>
                {scheduleTargetApp ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {scheduleTargetApp.candidate_name || scheduleTargetApp.name}
                    </p>
                    <p className="text-slate-500">
                      Applied for: {scheduleTargetApp.job_title || scheduleTargetApp.applied_for}
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={scheduleForm.application_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, application_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="">Select candidate application...</option>
                    {candidates.map((c) => (
                      <option key={c.application_id} value={c.application_id}>
                        {c.name} — {c.applied_for} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Date and Time *
                </label>
                <input 
                  type="datetime-local"
                  required
                  value={scheduleForm.schedule_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_time: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Interview Type
                  </label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Technical">Technical</option>
                    <option value="HR / Cultural">HR / Cultural</option>
                    <option value="Coding Round">Coding Round</option>
                    <option value="Final Selection">Final Selection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Stage Label
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Round 1"
                    value={scheduleForm.stage}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, stage: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {loading ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
