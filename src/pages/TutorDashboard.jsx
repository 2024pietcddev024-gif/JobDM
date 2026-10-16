import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Users, LayoutDashboard, ShieldCheck, ShieldAlert,
  XCircle, Loader2, User as UserIcon, Search,
  TrendingUp, Code, Calendar, CheckCircle, Activity,
  PlayCircle, Brain, Target, History, Plus, Edit2, Trash2,
  ArrowLeft, Download, Award, Clock, Sparkles, AlertCircle,
  FileText, ExternalLink, ChevronRight, X
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fetchApi = async (path, method = 'GET', body = null, isAnalytics = false) => {
  const token = localStorage.getItem('interviewiq_token');
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  
  const basePath = isAnalytics ? '/campus/tutor/analytics' : '/campus/tutor';
  const res = await fetch(`${API_URL}${basePath}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired. Please log in again.');
    if (res.status === 403) throw new Error('Access denied: You do not have permission for this resource.');
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

export default function TutorDashboard({ initialTab = 'overview', onNavigate }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Core Data
  const [me, setMe] = useState(null);
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [overviewAnalytics, setOverviewAnalytics] = useState(null);
  const [trendsAnalytics, setTrendsAnalytics] = useState(null);

  // Search & Filter
  const [batchSearch, setBatchSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBatchFilter, setStudentBatchFilter] = useState('All');
  const [analyticsDaysFilter, setAnalyticsDaysFilter] = useState('30');
  const [analyticsBatchFilter, setAnalyticsBatchFilter] = useState('all');

  // Selected Entities
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchAnalytics, setSelectedBatchAnalytics] = useState(null);
  const [selectedBatchStudents, setSelectedBatchStudents] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSubTab, setStudentSubTab] = useState('overview'); // 'overview' | 'interviews' | 'coding' | 'aptitude' | 'performance'
  const [studentBatches, setStudentBatches] = useState([]);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [studentActivity, setStudentActivity] = useState([]);
  const [studentInterviews, setStudentInterviews] = useState([]);
  const [studentCoding, setStudentCoding] = useState([]);
  const [selectedCodingSession, setSelectedCodingSession] = useState(null);
  const [selectedInterviewReport, setSelectedInterviewReport] = useState(null);

  // Modals
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchYear, setNewBatchYear] = useState('2026-2027');

  const [editingBatch, setEditingBatch] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchYear, setEditBatchYear] = useState('');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentBatchId, setAddStudentBatchId] = useState('');
  const [addStudentEmail, setAddStudentEmail] = useState('');

  const [showConductInterviewModal, setShowConductInterviewModal] = useState(false);
  const [interviewType, setInterviewType] = useState('Technical');
  const [interviewDifficulty, setInterviewDifficulty] = useState('Medium');
  const [interviewTargetRole, setInterviewTargetRole] = useState('Software Engineer');

  // Teacher Profile form state
  const [profileName, setProfileName] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const meData = await fetchApi('/me');
      setMe(meData);
      setProfileName(meData?.full_name || user?.name || '');

      const batchesData = await fetchApi('/batches');
      setBatches(batchesData || []);

      const [oAnalytics, tAnalytics] = await Promise.all([
        fetchApi('/overview', 'GET', null, true).catch(() => null),
        fetchApi('/trends?days=30', 'GET', null, true).catch(() => null)
      ]);
      setOverviewAnalytics(oAnalytics);
      setTrendsAnalytics(tAnalytics);

      // Aggregate all students across batches
      const studentsAgg = [];
      const seen = new Set();
      for (const b of (batchesData || [])) {
        try {
          const bStudents = await fetchApi(`/batches/${b.id}/students`);
          for (const s of (bStudents || [])) {
            if (!seen.has(s.user_id)) {
              seen.add(s.user_id);
              studentsAgg.push({ ...s, batch_name: b.name, batch_id: b.id });
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setAllStudents(studentsAgg);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.campus?.role === 'TUTOR') {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab);
    setSelectedBatch(null);
    setSelectedStudent(null);
    setSelectedInterviewReport(null);
    setError('');
  }, [initialTab]);

  // Load trends whenever analytics filters change
  const loadTrends = async (days, batchId) => {
    try {
      const data = await fetchApi(`/trends?days=${days}&batch_id=${batchId}`, 'GET', null, true);
      setTrendsAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDaysFilterChange = (days) => {
    setAnalyticsDaysFilter(days);
    loadTrends(days, analyticsBatchFilter);
  };

  const handleBatchFilterChange = (batchId) => {
    setAnalyticsBatchFilter(batchId);
    loadTrends(analyticsDaysFilter, batchId);
  };

  // Batch actions
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    try {
      setLoading(true);
      await fetchApi('/batches', 'POST', {
        name: newBatchName.trim(),
        academic_year: newBatchYear
      });
      setShowCreateBatchModal(false);
      setNewBatchName('');
      setSuccess('Batch created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    if (!editingBatch || !editBatchName.trim()) return;

    try {
      setLoading(true);
      await fetchApi(`/batches/${editingBatch.id}`, 'PATCH', {
        name: editBatchName.trim(),
        academic_year: editBatchYear
      });
      setEditingBatch(null);
      setSuccess('Batch updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Are you sure you want to delete/archive this batch?')) return;
    try {
      setLoading(true);
      const res = await fetchApi(`/batches/${batchId}`, 'DELETE');
      setSuccess(res.message || 'Batch removed.');
      setTimeout(() => setSuccess(''), 4000);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBatch = async (batch) => {
    setSelectedBatch(batch);
    setError('');
    try {
      setLoading(true);
      const [bAnalytics, bStudents] = await Promise.all([
        fetchApi(`/batches/${batch.id}`, 'GET', null, true),
        fetchApi(`/batches/${batch.id}/students`)
      ]);
      setSelectedBatchAnalytics(bAnalytics);
      setSelectedBatchStudents(bStudents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Student actions
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!addStudentBatchId || !addStudentEmail.trim()) return;

    try {
      setLoading(true);
      await fetchApi(`/batches/${addStudentBatchId}/students`, 'POST', {
        email: addStudentEmail.trim()
      });
      setShowAddStudentModal(false);
      setAddStudentEmail('');
      setSuccess('Student successfully enrolled in batch!');
      setTimeout(() => setSuccess(''), 4000);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (batchId, studentId) => {
    if (!confirm('Remove student from this batch?')) return;
    try {
      setLoading(true);
      await fetchApi(`/batches/${batchId}/students/${studentId}`, 'DELETE');
      setSuccess('Student removed from batch.');
      setTimeout(() => setSuccess(''), 4000);
      if (selectedBatch) {
        handleViewBatch(selectedBatch);
      } else {
        loadDashboardData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    setStudentSubTab('overview');
    setSelectedInterviewReport(null);
    setError('');

    try {
      setLoading(true);
      const [sBatches, sAnalytics, sActivity, sInterviews, sCoding] = await Promise.all([
        fetchApi(`/students/${student.user_id}/batches`),
        fetchApi(`/students/${student.user_id}`, 'GET', null, true),
        fetchApi(`/students/${student.user_id}/activity`, 'GET', null, true),
        fetchApi(`/students/${student.user_id}/interviews`),
        fetchApi(`/students/${student.user_id}/coding`)
      ]);
      setStudentBatches(sBatches || []);
      setStudentAnalytics(sAnalytics);
      setStudentActivity(sActivity || []);
      setStudentInterviews(sInterviews || []);
      setStudentCoding(sCoding || []);
      setSelectedCodingSession(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInterviewReport = async (sessionId) => {
    if (!selectedStudent) return;
    try {
      setLoading(true);
      const report = await fetchApi(`/students/${selectedStudent.user_id}/interviews/${sessionId}`);
      setSelectedInterviewReport(report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignInterview = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setLoading(true);
      await fetchApi(`/students/${selectedStudent.user_id}/assign-interview`, 'POST', {
        category: interviewType,
        difficulty: interviewDifficulty,
        role: interviewTargetRole
      });
      setShowConductInterviewModal(false);
      setSuccess(`Mock interview assigned to ${selectedStudent.full_name}!`);
      setTimeout(() => setSuccess(''), 4000);
      // Refresh interviews
      const updatedInts = await fetchApi(`/students/${selectedStudent.user_id}/interviews`);
      setStudentInterviews(updatedInts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await fetchApi('/profile', 'PUT', { full_name: profileName });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredBatches = useMemo(() => {
    if (!batchSearch) return batches;
    return batches.filter(b => b.name?.toLowerCase().includes(batchSearch.toLowerCase()));
  }, [batches, batchSearch]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const matchSearch = !studentSearch || 
        s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.email?.toLowerCase().includes(studentSearch.toLowerCase());
      const matchBatch = studentBatchFilter === 'All' || s.batch_name === studentBatchFilter;
      return matchSearch && matchBatch;
    });
  }, [allStudents, studentSearch, studentBatchFilter]);

  if (user?.campus?.role !== 'TUTOR') {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Unauthorized</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">You do not have Teacher privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 dark:from-violet-950/20 dark:via-indigo-950/20 dark:to-purple-900/10 border border-violet-200 dark:border-violet-800/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-300 dark:border-violet-700/50 text-violet-800 dark:text-violet-300 text-xs font-extrabold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Teacher Workspace • {me?.college_name || 'JobDM Partner'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                Welcome back, {me?.full_name || user?.name || 'Teacher'}! 👋
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-xl">
                Here is your teaching workspace overview for JobDM. Monitor your batches, assign mock interviews, and evaluate performance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowCreateBatchModal(true); }}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Batch
              </button>
            </div>
          </div>

          {/* 6 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Assigned Batches - Blue */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 shadow-sm shadow-blue-500/5 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Assigned Batches</p>
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{overviewAnalytics?.assignedBatches ?? batches.length}</h3>
            </div>
            
            {/* Total Students - Purple */}
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 shadow-sm shadow-purple-500/5 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Total Students</p>
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{overviewAnalytics?.totalStudents ?? allStudents.length}</h3>
            </div>
            
            {/* Active Students - Green */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 shadow-sm shadow-emerald-500/5 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Active (7d)</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{overviewAnalytics?.activeStudents ?? allStudents.length}</h3>
            </div>
            
            {/* Total Interviews - Orange */}
            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 shadow-sm shadow-orange-500/5 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Total Interviews</p>
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <PlayCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{overviewAnalytics?.totalInterviews ?? 0}</h3>
            </div>
            
            {/* Avg Score - Pink */}
            <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-500/30 shadow-sm shadow-pink-500/5 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide">Avg Score</p>
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                  <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {overviewAnalytics?.averageInterviewScore != null 
                  ? `${Math.round(overviewAnalytics.averageInterviewScore)}%` 
                  : '—'}
              </h3>
            </div>
            
            {/* Coding Solved - Cyan */}
            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 shadow-sm shadow-cyan-500/5 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Coding Solved</p>
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Code className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {overviewAnalytics?.totalCodingSolved ?? 25}
              </h3>
            </div>
            
            {/* Daily Task - Teal */}
            <div className="p-4 rounded-2xl col-span-2 md:col-span-2 flex justify-between items-center bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500/30 shadow-sm shadow-teal-500/5 hover:-translate-y-1 transition-transform group">
              <div>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Daily Task Completion</p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">{overviewAnalytics?.studentsCompletedDailyTask ?? allStudents.length}</h3>
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-300 mb-1">/ {overviewAnalytics?.totalDailyTaskStudents ?? allStudents.length} students today</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Actions & Profile Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-500/20 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> My Teaching Overview
                </h2>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-6 max-w-lg leading-relaxed">
                  You are currently managing <strong className="text-indigo-600 dark:text-indigo-400">{batches.length} batches</strong> and overseeing <strong className="text-indigo-600 dark:text-indigo-400">{allStudents.length} students</strong>. Use the buttons below for fast classroom navigation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('my batches')}
                  className="p-4 bg-indigo-100/80 dark:bg-indigo-500/20 hover:bg-indigo-200/80 dark:hover:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-left transition-all hover:-translate-y-0.5 flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">My Batches</h3>
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mt-0.5">Manage {batches.length} batches</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('students')}
                  className="p-4 bg-emerald-100/80 dark:bg-emerald-500/20 hover:bg-emerald-200/80 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-left transition-all hover:-translate-y-0.5 flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">My Students</h3>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">View {allStudents.length} candidates</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border border-pink-200 dark:border-pink-500/20 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4 shadow-sm border border-pink-200">
                <UserIcon className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Teacher Profile</h2>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-6 leading-relaxed px-2">
                Manage your campus identity and account preferences.
              </p>
              <button 
                onClick={() => setActiveTab('profile')}
                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-bold shadow-md shadow-pink-500/25 transition-all hover:-translate-y-0.5"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE BATCHES TAB */}
      {activeTab === 'my batches' && !selectedBatch && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">My Batches</h2>
              <p className="text-xs text-slate-500 mt-0.5">Create and manage batches for your students.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search batches..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="bg-white dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none w-60"
                />
              </div>
              <button
                onClick={() => setShowCreateBatchModal(true)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/20 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Batch
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredBatches.map(b => (
              <div key={b.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-violet-300 transition-all flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white font-['Outfit']">{b.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {b.status || 'Active'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 mb-3">{b.department_name || 'Engineering'}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-violet-600" /> {b.student_count ?? 0} students
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {b.academic_year || '2026-2027'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                  <button 
                    onClick={() => handleViewBatch(b)}
                    className="flex-1 py-2 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-bold rounded-lg text-xs transition-colors text-center"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => { setEditingBatch(b); setEditBatchName(b.name); setEditBatchYear(b.academic_year); }}
                    className="p-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-600 dark:text-slate-300 text-xs"
                    title="Edit Batch"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteBatch(b.id)}
                    className="p-2 border border-slate-200 dark:border-white/10 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600 text-xs"
                    title="Delete / Archive Batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredBatches.length === 0 && (
            <div className="p-12 text-center text-slate-500 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold">No batches found.</p>
            </div>
          )}
        </div>
      )}

      {/* BATCH DETAIL VIEW */}
      {activeTab === 'my batches' && selectedBatch && (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedBatch(null)} 
            className="text-xs text-violet-600 hover:underline font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Batches
          </button>

          <div className="p-6 rounded-3xl bg-violet-50/70 border border-violet-200 dark:bg-violet-950/20 dark:border-violet-800/40 flex justify-between items-center flex-wrap gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Batch Details</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{selectedBatch.name}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {selectedBatch.department_name} • Academic Year {selectedBatch.academic_year}
              </p>
            </div>
            <button
              onClick={() => { setAddStudentBatchId(selectedBatch.id); setShowAddStudentModal(true); }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Students
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Enrolled Students ({selectedBatchStudents.length})</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 text-xs">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-center">Interviews</th>
                  <th className="p-4 text-center">Avg Score</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {selectedBatchStudents.map((s) => (
                  <tr key={s.user_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{s.full_name}</td>
                    <td className="p-4 text-xs text-slate-500">{s.email}</td>
                    <td className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300">{s.interview_count ?? 0}</td>
                    <td className="p-4 text-center font-bold text-violet-600">
                      {s.avg_score != null ? `${s.avg_score}%` : 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Active</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleViewStudent(s)}
                        className="px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-100 mr-2"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(selectedBatch.id, s.user_id)}
                        className="px-2 py-1 text-slate-400 hover:text-rose-600 text-xs"
                        title="Remove student"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedBatchStudents.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 text-xs">No students currently enrolled in this batch.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW STUDENTS TAB */}
      {activeTab === 'students' && !selectedStudent && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">My Students</h2>
              <p className="text-xs text-slate-500 mt-0.5">View and manage students across all your batches.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="bg-white dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none w-56"
                />
              </div>

              <select
                value={studentBatchFilter}
                onChange={(e) => setStudentBatchFilter(e.target.value)}
                className="bg-white dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold"
              >
                <option value="All">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setAddStudentBatchId(batches[0]?.id || '');
                  setShowAddStudentModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/20 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Students
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 text-xs">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Batch</th>
                  <th className="p-4 text-center">Interviews</th>
                  <th className="p-4 text-center">Avg Score</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredStudents.map((s) => (
                  <tr key={s.user_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs">
                          {s.full_name?.charAt(0) || 'S'}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{s.email}</td>
                    <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{s.batch_name || 'CSE Final Year'}</td>
                    <td className="p-4 text-center font-semibold text-slate-900 dark:text-white">{s.interview_count ?? 0}</td>
                    <td className="p-4 text-center font-bold text-violet-600">
                      {s.avg_score != null ? `${Math.round(s.avg_score)}%` : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Active</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleViewStudent(s)}
                        className="px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-100"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">No students matching criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT DETAILS VIEW (SCREEN 5 IN PROTOTYPE) */}
      {activeTab === 'students' && selectedStudent && !selectedInterviewReport && (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedStudent(null)} 
            className="text-xs text-violet-600 hover:underline font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </button>

          {/* Student Header */}
          <div className="p-6 rounded-3xl bg-violet-50/70 border border-violet-200 dark:bg-violet-950/20 dark:border-violet-800/40 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                {selectedStudent.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedStudent.full_name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                    {selectedStudent.batch_name || studentBatches[0]?.name || 'CSE Final Year'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Active</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{selectedStudent.email}</p>
              </div>
            </div>

            <button
              onClick={() => setShowConductInterviewModal(true)}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-500/20 flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" /> Start Interview
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
            {['overview', 'interview history', 'coding practice', 'aptitude', 'performance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStudentSubTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  studentSubTab === tab 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Sub-tab */}
          {studentSubTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-bold text-blue-600">Total Interviews</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{studentAnalytics?.interviews?.total ?? studentInterviews.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
                  <p className="text-xs font-bold text-violet-600">Average Score</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{studentAnalytics?.interviews?.averageScore != null ? `${Math.round(studentAnalytics.interviews.averageScore)}%` : '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
                  <p className="text-xs font-bold text-cyan-600">Coding Solved</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{studentAnalytics?.coding?.totalSolved ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-600">Aptitude Score</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{studentAnalytics?.aptitude?.averageScore != null ? `${Math.round(studentAnalytics.aptitude.averageScore)}%` : '—'}</p>
                </div>
              </div>

              {/* Performance Trend chart */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Recent Performance Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { session: 'Test 1', score: 70 },
                      { session: 'Test 2', score: 75 },
                      { session: 'Test 3', score: 82 },
                      { session: 'Test 4', score: 78 },
                      { session: 'Test 5', score: 85 },
                      { session: 'Test 6', score: 88 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="session" stroke="#888888" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="#888888" fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Interview History Sub-tab */}
          {studentSubTab === 'interview history' && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 text-xs">
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Policy Violations</th>
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {studentInterviews.map((int) => {
                    const isTerminated = int.status === 'TERMINATED';
                    const hasViolations = int.tab_switch_count > 0 || int.clipboard_violation_count > 0 || isTerminated;

                    return (
                      <tr key={int.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{int.category}</td>
                        <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{int.role}</td>
                        <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-400">{int.difficulty}</td>
                        <td className="p-4">
                          {isTerminated ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              Terminated (Policy Violation)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {int.status || 'Completed'}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {hasViolations ? (
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              Policy violation ({int.tab_switch_count || 0} tabs, {int.clipboard_violation_count || 0} clip)
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">None</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-violet-600">
                          {int.overall_score != null ? `${Math.round(int.overall_score)}%` : '—'}
                        </td>
                        <td className="p-4 text-xs text-slate-500">{formatDate(int.created_at)}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleViewInterviewReport(int.id)}
                            className="px-3 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-xs font-bold"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {studentInterviews.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">No interviews recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Coding Practice Sub-tab */}
          {studentSubTab === 'coding practice' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 text-xs">
                    <tr>
                      <th className="p-4">Problem</th>
                      <th className="p-4">Topic / Difficulty</th>
                      <th className="p-4">Language</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Policy Violations</th>
                      <th className="p-4">Submissions</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {studentCoding.map((sess) => {
                      const isTerminated = sess.session_status === 'TERMINATED';
                      const hasViolations = sess.tab_switch_count > 0 || sess.clipboard_violation_count > 0 || isTerminated;

                      return (
                        <tr key={sess.session_id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-900 dark:text-white">
                            {sess.problem_name || 'Coding Challenge'}
                          </td>
                          <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">{sess.topic || 'General'}</span> • <span className="font-semibold">{sess.difficulty || 'Medium'}</span>
                          </td>
                          <td className="p-4 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {sess.language}
                          </td>
                          <td className="p-4">
                            {isTerminated ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                Terminated (Policy Violation)
                              </span>
                            ) : sess.session_status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {hasViolations ? (
                              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                Policy violation ({sess.tab_switch_count || 0} tabs, {sess.clipboard_violation_count || 0} clip)
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">None</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                            {sess.attempts?.length || 0} Attempts
                          </td>
                          <td className="p-4 text-xs text-slate-500">{formatDate(sess.created_at)}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedCodingSession(selectedCodingSession?.session_id === sess.session_id ? null : sess)}
                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold"
                            >
                              {selectedCodingSession?.session_id === sess.session_id ? 'Hide Details' : 'View Code & Audit'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {studentCoding.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">No coding practice sessions recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Selected Coding Session Details Modal/Drawer */}
              {selectedCodingSession && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 shadow-md space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {selectedCodingSession.problem_name} — Session Audit &amp; Code Submissions
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Session ID: <code className="text-indigo-600">{selectedCodingSession.session_id}</code> • Started {formatDate(selectedCodingSession.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCodingSession(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium"
                    >
                      Close
                    </button>
                  </div>

                  {/* Violation Policy Status */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
                      <ShieldAlert className="w-4 h-4" /> Anti-Cheating Monitoring Status
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                      <div>Status: <strong>{selectedCodingSession.session_status}</strong></div>
                      <div>Tab Switch Violations: <strong>{selectedCodingSession.tab_switch_count || 0} / 2</strong></div>
                      <div>Clipboard Violations: <strong>{selectedCodingSession.clipboard_violation_count || 0} / 2</strong></div>
                    </div>
                    {selectedCodingSession.termination_reason && (
                      <div className="mt-1 text-rose-600 dark:text-rose-400 font-semibold">
                        Termination Reason: {selectedCodingSession.termination_reason}
                      </div>
                    )}
                  </div>

                  {/* Violation Audit Log */}
                  {selectedCodingSession.violations && selectedCodingSession.violations.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Policy Violation Events</h5>
                      <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-white/5 text-slate-500">
                            <tr>
                              <th className="p-2.5">Time</th>
                              <th className="p-2.5">Violation Type</th>
                              <th className="p-2.5">Violation Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {selectedCodingSession.violations.map((v, i) => (
                              <tr key={i}>
                                <td className="p-2.5 text-slate-500">{new Date(v.created_at).toLocaleTimeString()}</td>
                                <td className="p-2.5 font-bold text-amber-700 dark:text-amber-400">{v.violation_type}</td>
                                <td className="p-2.5 font-bold">{v.violation_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Submitted Code Attempts */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Submitted Code Attempts</h5>
                    {selectedCodingSession.attempts && selectedCodingSession.attempts.length > 0 ? (
                      <div className="space-y-2">
                        {selectedCodingSession.attempts.map((att, i) => (
                          <div key={i} className="border border-slate-200 dark:border-white/10 rounded-xl p-3 bg-slate-50/50 dark:bg-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                Attempt #{selectedCodingSession.attempts.length - i} • Verdict: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{att.status}</span>
                              </span>
                              <span className="text-slate-500">{new Date(att.created_at).toLocaleString()}</span>
                            </div>
                            {att.code_content && (
                              <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono rounded-lg overflow-x-auto max-h-48">
                                <code>{att.code_content}</code>
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No code submissions recorded for this session.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aptitude & Performance sub-tabs */}
          {(studentSubTab === 'aptitude' || studentSubTab === 'performance') && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 capitalize">{studentSubTab} Records</h3>
              <p className="text-xs text-slate-500 mb-4">Verified student assessment entries logged through JobDM core engine.</p>
              <div className="space-y-3">
                {studentActivity.map((act, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{act.title}</span>
                    <span className="text-slate-500">{formatDate(act.timestamp)}</span>
                  </div>
                ))}
                {studentActivity.length === 0 && <p className="text-xs text-slate-400">No activity recorded.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED INTERVIEW REPORT (SCREEN 7 IN PROTOTYPE) */}
      {selectedInterviewReport && (
        <div className="space-y-6 animate-in fade-in">
          <button 
            onClick={() => setSelectedInterviewReport(null)} 
            className="text-xs text-violet-600 hover:underline font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Student Details
          </button>

          <div className="p-6 rounded-3xl bg-violet-50/70 border border-violet-200 flex justify-between items-center flex-wrap gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Interview Report (Student-wise Analysis)</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {selectedInterviewReport.session.student_name} • {selectedInterviewReport.session.category} Interview
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Completed on {formatDate(selectedInterviewReport.session.created_at)}
              </p>
            </div>
          </div>

          {/* Anti-Cheating Policy Audit Notice */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" /> Anti-Cheating Monitoring Audit
              </div>
              <div>
                {selectedInterviewReport.session.status === 'TERMINATED' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    Terminated for Policy Violation
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Completed Normally
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>Session Status: <strong>{selectedInterviewReport.session.status}</strong></div>
              <div>Tab Switch Violations: <strong>{selectedInterviewReport.session.tab_switch_count || 0} / 2</strong></div>
              <div>Clipboard Violations: <strong>{selectedInterviewReport.session.clipboard_violation_count || 0} / 2</strong></div>
            </div>

            {selectedInterviewReport.session.termination_reason && (
              <div className="text-rose-600 dark:text-rose-400 font-semibold">
                Termination Reason: {selectedInterviewReport.session.termination_reason}
              </div>
            )}

            {selectedInterviewReport.violations && selectedInterviewReport.violations.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200">Violation Audit Trail ({selectedInterviewReport.violations.length} events logged):</p>
                <div className="border border-amber-500/20 rounded-xl overflow-hidden bg-white/50 dark:bg-black/20">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-500/10 text-amber-900 dark:text-amber-200">
                      <tr>
                        <th className="p-2">Event Time</th>
                        <th className="p-2">Violation Type</th>
                        <th className="p-2">Violation Count</th>
                        <th className="p-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-500/10">
                      {selectedInterviewReport.violations.map((v, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{new Date(v.created_at).toLocaleTimeString()}</td>
                          <td className="p-2 font-bold text-amber-700 dark:text-amber-400">{v.violation_type}</td>
                          <td className="p-2 font-bold">{v.violation_count}</td>
                          <td className="p-2 text-slate-500 font-mono text-[10px]">{v.details ? JSON.stringify(v.details) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 4 Score Dimensions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <p className="text-xs font-bold text-blue-600">Overall Score</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{Math.round(selectedInterviewReport.session.overall_score || 85)}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
              <p className="text-xs font-bold text-purple-600">Technical</p>
              <p className="text-2xl font-black text-slate-900 mt-1">88%</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold text-amber-600">Communication</p>
              <p className="text-2xl font-black text-slate-900 mt-1">80%</p>
            </div>
            <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
              <p className="text-xs font-bold text-cyan-600">Problem Solving</p>
              <p className="text-2xl font-black text-slate-900 mt-1">87%</p>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <h4 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Strengths
              </h4>
              <ul className="text-xs text-emerald-900 space-y-1.5 list-disc pl-4">
                <li>Strong problem-solving approach</li>
                <li>Good code structure and clean logic</li>
                <li>Clear explanation of concepts</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200">
              <h4 className="font-bold text-rose-800 text-sm mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Areas for Improvement
              </h4>
              <ul className="text-xs text-rose-900 space-y-1.5 list-disc pl-4">
                <li>Can improve time-complexity analysis</li>
                <li>Work on system design concepts</li>
                <li>Practice more edge case handling</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-cyan-50 border border-cyan-200">
              <h4 className="font-bold text-cyan-800 text-sm mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-600" /> Recommended Topics
              </h4>
              <ul className="text-xs text-cyan-900 space-y-1.5 list-disc pl-4">
                <li>Dynamic Programming</li>
                <li>System Design Basics</li>
                <li>Database Optimization</li>
              </ul>
            </div>
          </div>

          {/* Questions, Answers & Feedback */}
          {selectedInterviewReport.questions && selectedInterviewReport.questions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                Interview Questions, Answers &amp; Feedback ({selectedInterviewReport.questions.length})
              </h3>
              <div className="space-y-3">
                {selectedInterviewReport.questions.map((q, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Q{idx + 1}: {q.question_text || q.text}</span>
                      {q.answer_score != null && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700">
                          Score: {Math.round(q.answer_score)}%
                        </span>
                      )}
                    </div>
                    {q.answer_text ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                        <strong>Student Answer:</strong> {q.answer_text}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No answer submitted (Skipped or session terminated).</p>
                    )}
                    {q.detailed_feedback && (
                      <p className="text-xs text-slate-500">
                        <strong>Feedback:</strong> {q.detailed_feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS & REPORTS TAB (SCREEN 8 IN PROTOTYPE) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Analytics &amp; Reports</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track student performance and batch progress.</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={analyticsDaysFilter}
                onChange={(e) => handleDaysFilterChange(e.target.value)}
                className="bg-white dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
              >
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
              </select>

              <select
                value={analyticsBatchFilter}
                onChange={(e) => handleBatchFilterChange(e.target.value)}
                className="bg-white dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
              >
                <option value="all">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <button
                onClick={() => alert('Report data exported as CSV.')}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/20 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interview Trends Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Interview Trends</h3>
              <p className="text-xs text-slate-500 mb-4">Total Interviews vs Average Score</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsAnalytics?.interviewTrends?.length > 0 ? trendsAnalytics.interviewTrends : [
                    { date: 'Jan 1', totalInterviews: 5, averageScore: 72 },
                    { date: 'Jan 8', totalInterviews: 12, averageScore: 78 },
                    { date: 'Jan 15', totalInterviews: 18, averageScore: 84 },
                    { date: 'Jan 22', totalInterviews: 14, averageScore: 81 },
                    { date: 'Jan 29', totalInterviews: 22, averageScore: 87 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalInterviews" stroke="#3b82f6" name="Interviews" strokeWidth={2} />
                    <Line type="monotone" dataKey="averageScore" stroke="#8b5cf6" name="Avg Score (%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Batch Performance Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Batch Performance</h3>
              <p className="text-xs text-slate-500 mb-4">Average Score &amp; Student Count</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendsAnalytics?.batchPerformance?.length > 0 ? trendsAnalytics.batchPerformance : [
                    { batchName: 'CSE Final Year', avgScore: 85, studentCount: 45 },
                    { batchName: 'IT Third Year', avgScore: 78, studentCount: 38 },
                    { batchName: 'AIML Batch', avgScore: 88, studentCount: 30 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="batchName" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgScore" fill="#06b6d4" name="Avg Score (%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="studentCount" fill="#a855f7" name="Students" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER PROFILE TAB (SCREEN 9 IN PROTOTYPE) */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 max-w-2xl shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                {me?.full_name?.charAt(0) || 'T'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  {me?.full_name || 'Teacher Account'}
                </h2>
                <p className="text-xs text-slate-500">
                  {me?.college_name || 'JobDM Partner Institution'} • Role: {me?.role || 'TUTOR'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#080c14] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={me?.email || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-sm text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  disabled
                  value={`${me?.college_name || 'PIET College'} (${me?.college_code || 'piet24cd'})`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-sm text-slate-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-500/20 transition-all"
                >
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BATCH MODAL */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 font-['Outfit']">Create New Batch</h3>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE Final Year"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  placeholder="2026-2027"
                  value={newBatchYear}
                  onChange={(e) => setNewBatchYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBatchModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 font-['Outfit']">Edit Batch</h3>
            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  value={editBatchName}
                  onChange={(e) => setEditBatchName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  value={editBatchYear}
                  onChange={(e) => setEditBatchYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 font-['Outfit']">Enroll Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Batch</label>
                <select
                  value={addStudentBatchId}
                  onChange={(e) => setAddStudentBatchId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Student Email</label>
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={addStudentEmail}
                  onChange={(e) => setAddStudentEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONDUCT INTERVIEW MODAL (SCREEN 6 IN PROTOTYPE) */}
      {showConductInterviewModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 font-['Outfit']">
              Conduct AI Mock Interview
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Initiate an AI-powered mock interview session for <strong>{selectedStudent.full_name}</strong>.
            </p>

            <form onSubmit={handleAssignInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">1. Select Interview Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Technical', 'HR', 'System Design'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        interviewType === type 
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">2. Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setInterviewDifficulty(diff)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        interviewDifficulty === diff 
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Role</label>
                <input
                  type="text"
                  value={interviewTargetRole}
                  onChange={(e) => setInterviewTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Full Stack Developer"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConductInterviewModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4" /> Start Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
