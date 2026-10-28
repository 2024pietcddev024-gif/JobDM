import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Layers, ShieldCheck, CheckCircle2, 
  XCircle, Loader2, UserPlus, Trash2, GraduationCap,
  Activity, BrainCircuit, Code2, LineChart, PieChart, Star, Target, TrendingUp, Trophy, Zap, MessageSquare, Briefcase, Calendar, ChevronRight,
  Upload, Download, FileSpreadsheet, Key, RefreshCw, FileText, CheckCircle, AlertTriangle, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fetchApi = async (path, method = 'GET', body = null) => {
  const token = localStorage.getItem('interviewiq_token');
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  
  const res = await fetch(`${API_URL}/campus/admin${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired. Please log in again.');
    if (res.status === 403) throw new Error('You do not have access to this analytics data.');
    if (res.status === 404) throw new Error('Analytics data not found.');
    if (res.status === 409) throw new Error('This record already exists or conflicts with an existing assignment.');
    if (res.status === 400) throw new Error('Please check the entered information.');
    throw new Error('Unable to load analytics. Please try again.');
  }
  return data;
};

export default function CollegeAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Data state
  const [college, setCollege] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Analytics State
  const [overviewAnalytics, setOverviewAnalytics] = useState(null);
  const [domainsAnalytics, setDomainsAnalytics] = useState([]);
  const [departmentsAnalytics, setDepartmentsAnalytics] = useState([]);
  const [batchesAnalytics, setBatchesAnalytics] = useState([]);
  const [tutorsAnalytics, setTutorsAnalytics] = useState([]);
  const [studentsAnalytics, setStudentsAnalytics] = useState([]);
  const [activityAnalytics, setActivityAnalytics] = useState([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState({});

  // Specific Batch Details
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchTutors, setBatchTutors] = useState([]);
  
  // Modals / Forms
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [showManageBatchTutors, setShowManageBatchTutors] = useState(false);
  const [showManageBatchStudents, setShowManageBatchStudents] = useState(false);

  // Bulk Provisioning State
  const [provisionPastedText, setProvisionPastedText] = useState('');
  const [provisionParsedUsers, setProvisionParsedUsers] = useState([]);
  const [provisionForcePasswordChange, setProvisionForcePasswordChange] = useState(true);
  const [provisionAutoCreate, setProvisionAutoCreate] = useState(true);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionSuccessReport, setProvisionSuccessReport] = useState(null);
  const [provisionedDirectory, setProvisionedDirectory] = useState([]);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState('ALL');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [resetResult, setResetResult] = useState(null);

  const loadInitialData = async () => {
    try {
      setLoading(true); setError('');
      const [col, depts, bats, tuts, studs] = await Promise.all([
        fetchApi('/college').catch(() => null),
        fetchApi('/departments').catch(() => []),
        fetchApi('/batches').catch(() => []),
        fetchApi('/tutors').catch(() => []),
        fetchApi('/students').catch(() => [])
      ]);
      if(col) setCollege(col);
      setDepartments(depts);
      setBatches(bats);
      setTutors(tuts);
      setStudents(studs);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.campus?.role === 'COLLEGE_ADMIN') {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.campus?.role !== 'COLLEGE_ADMIN') return;
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(prev => ({ ...prev, [activeTab]: true }));
        if (activeTab === 'overview') {
          const [ov, dom, act] = await Promise.all([
             fetchApi('/analytics/overview').catch(() => null),
             fetchApi('/analytics/domains').catch(() => []),
             fetchApi('/analytics/activity').catch(() => [])
          ]);
          setOverviewAnalytics(ov);
          setDomainsAnalytics(dom || []);
          setActivityAnalytics(act || []);
        } else if (activeTab === 'departments') {
          const da = await fetchApi('/analytics/departments').catch(() => []);
          setDepartmentsAnalytics(da || []);
        } else if (activeTab === 'batches') {
          const ba = await fetchApi('/analytics/batches').catch(() => []);
          setBatchesAnalytics(ba || []);
        } else if (activeTab === 'tutors') {
          const ta = await fetchApi('/analytics/tutors').catch(() => []);
          setTutorsAnalytics(ta || []);
        } else if (activeTab === 'students') {
          const sa = await fetchApi('/analytics/students').catch(() => []);
          setStudentsAnalytics(sa || []);
        } else if (activeTab === 'bulk-provision') {
          const dir = await fetchApi('/provisioned-directory').catch(() => []);
          setProvisionedDirectory(dir || []);
        }
      } catch(e) {
        // Silently handle analytics failures to not break management
      } finally {
        setAnalyticsLoading(prev => ({ ...prev, [activeTab]: false }));
      }
    };
    fetchAnalytics();
  }, [activeTab, user]);

  if (user?.campus?.role !== 'COLLEGE_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Unauthorized</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">You do not have COLLEGE_ADMIN privileges.</p>
      </div>
    );
  }

  // DEPARTMENTS
  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), code: fd.get('code') };
    try {
      setError(''); setLoading(true);
      if (editingDept) {
        await fetchApi(`/departments/${editingDept.id}`, 'PATCH', body);
      } else {
        await fetchApi('/departments', 'POST', body);
      }
      setShowDeptModal(false); setEditingDept(null);
      const depts = await fetchApi('/departments');
      setDepartments(depts);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  // BATCHES
  const handleSaveBatch = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { 
      name: fd.get('name'), 
      academic_year: fd.get('academic_year'),
      department_id: fd.get('department_id') 
    };
    if (editingBatch) body.status = fd.get('status');

    try {
      setError(''); setLoading(true);
      if (editingBatch) {
        await fetchApi(`/batches/${editingBatch.id}`, 'PATCH', body);
      } else {
        await fetchApi('/batches', 'POST', body);
      }
      setShowBatchModal(false); setEditingBatch(null);
      const bats = await fetchApi('/batches');
      setBatches(bats);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  // TUTORS
  const handleAddTutor = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      setError(''); setLoading(true);
      await fetchApi('/tutors', 'POST', { userId: fd.get('userId') });
      setShowTutorModal(false);
      const tuts = await fetchApi('/tutors');
      setTutors(tuts);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const toggleTutorStatus = async (tutor) => {
    try {
      setError(''); setLoading(true);
      const newStatus = tutor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await fetchApi(`/tutors/${tutor.user_id}/status`, 'PATCH', { status: newStatus });
      const tuts = await fetchApi('/tutors');
      setTutors(tuts);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  // MANAGE BATCH TUTORS
  const openManageBatchTutors = async (batch) => {
    setSelectedBatch(batch);
    setShowManageBatchTutors(true);
    try {
      setLoading(true); setError('');
      const data = await fetchApi(`/batches/${batch.id}/tutors`);
      setBatchTutors(data);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const assignTutorToBatch = async (e) => {
    e.preventDefault();
    const tutorId = new FormData(e.target).get('tutorId');
    try {
      setLoading(true); setError('');
      await fetchApi(`/batches/${selectedBatch.id}/tutors`, 'POST', { tutorUserId: tutorId });
      const data = await fetchApi(`/batches/${selectedBatch.id}/tutors`);
      setBatchTutors(data);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const removeTutorFromBatch = async (tutorUserId) => {
    if (!window.confirm("Remove this tutor from the batch?")) return;
    try {
      setLoading(true); setError('');
      await fetchApi(`/batches/${selectedBatch.id}/tutors/${tutorUserId}`, 'DELETE');
      setBatchTutors(prev => prev.filter(t => t.tutor_user_id !== tutorUserId));
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  // MANAGE BATCH STUDENTS
  const openManageBatchStudents = async (batch) => {
    setSelectedBatch(batch);
    setShowManageBatchStudents(true);
    try {
      setLoading(true); setError('');
      const studs = await fetchApi('/students');
      setStudents(studs);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const enrollStudentToBatch = async (e) => {
    e.preventDefault();
    const studentId = new FormData(e.target).get('studentId');
    try {
      setLoading(true); setError('');
      await fetchApi(`/batches/${selectedBatch.id}/students`, 'POST', { studentUserId: studentId });
      alert("Student enrolled successfully.");
      const studs = await fetchApi('/students');
      setStudents(studs);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const removeStudentFromBatch = async (studentUserId) => {
    if (!window.confirm("Remove this student from the batch?")) return;
    try {
      setLoading(true); setError('');
      await fetchApi(`/batches/${selectedBatch.id}/students/${studentUserId}`, 'DELETE');
      alert("Student removed from batch.");
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleSelectStudentDetail = async (studentId) => {
    setSelectedStudentId(studentId);
    setStudentDetail(null);
    try {
      setAnalyticsLoading(prev => ({ ...prev, studentDetail: true }));
      const details = await fetchApi(`/analytics/students/${studentId}`);
      setStudentDetail(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyticsLoading(prev => ({ ...prev, studentDetail: false }));
    }
  };

  // CSV & Bulk Provisioning Helper Functions
  const parseCSVText = (text) => {
    if (!text || !text.trim()) return [];
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

    const nameIdx = headers.findIndex(h => h.includes('name'));
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const pwdIdx = headers.findIndex(h => h.includes('pass') || h.includes('pwd'));
    const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('type'));
    const deptIdx = headers.findIndex(h => h.includes('dept') || h.includes('branch'));
    const batchIdx = headers.findIndex(h => h.includes('batch') || h.includes('class') || h.includes('section'));
    const rollIdx = headers.findIndex(h => h.includes('roll') || h.includes('student_id') || h.includes('id_number'));

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || cols.every(c => !c)) continue;

      const row = {
        name: nameIdx !== -1 ? cols[nameIdx] : cols[0] || '',
        email: emailIdx !== -1 ? cols[emailIdx] : cols[1] || '',
        password: pwdIdx !== -1 ? cols[pwdIdx] : (cols[2] || ''),
        role: roleIdx !== -1 ? cols[roleIdx] : (cols[3] || 'STUDENT'),
        department: deptIdx !== -1 ? cols[deptIdx] : (cols[4] || ''),
        batch: batchIdx !== -1 ? cols[batchIdx] : (cols[5] || ''),
        roll_number: rollIdx !== -1 ? cols[rollIdx] : (cols[6] || '')
      };

      if (row.name || row.email) {
        parsed.push(row);
      }
    }
    return parsed;
  };

  const downloadCSV = (filename, content) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleCSV = () => {
    const colCode = college?.code || 'CAMPUS';
    const sample = `Full Name,Email,Initial Password,Role,Department,Batch,Roll Number\n` +
`Aarav Sharma,aarav.sharma@${college?.domain || 'college.edu.in'},${colCode}@2026,STUDENT,CSE,Batch 2027 CSE-A,2023-CS-001\n` +
`Priya Verma,priya.verma@${college?.domain || 'college.edu.in'},${colCode}@2026,STUDENT,CSE,Batch 2027 CSE-A,2023-CS-002\n` +
`Rohan Gupta,rohan.gupta@${college?.domain || 'college.edu.in'},${colCode}@2026,STUDENT,ECE,Batch 2027 ECE-B,2023-EC-045\n` +
`Dr. Ramesh Kumar,ramesh.kumar@${college?.domain || 'college.edu.in'},Prof@${colCode}2026,TEACHER,CSE,Batch 2027 CSE-A,FAC-014\n` +
`Dr. Sunita Rao,sunita.rao@${college?.domain || 'college.edu.in'},Prof@${colCode}2026,TEACHER,ECE,Batch 2027 ECE-B,FAC-021\n`;
    downloadCSV(`InterviewIQ_${colCode}_Roster_Template.csv`, sample);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setProvisionPastedText(text);
        const parsed = parseCSVText(text);
        setProvisionParsedUsers(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handlePastedTextChange = (text) => {
    setProvisionPastedText(text);
    const parsed = parseCSVText(text);
    setProvisionParsedUsers(parsed);
  };

  const handleExecuteBulkProvision = async () => {
    if (provisionParsedUsers.length === 0) {
      setError('Please provide at least one valid user record to provision.');
      return;
    }
    setProvisionLoading(true);
    setError('');
    setProvisionSuccessReport(null);

    try {
      const res = await fetchApi('/bulk-provision', 'POST', {
        users: provisionParsedUsers,
        forcePasswordChange: provisionForcePasswordChange,
        autoCreateDepartmentsAndBatches: provisionAutoCreate
      });

      setProvisionSuccessReport(res);
      const [dir, depts, bats, tuts, studs] = await Promise.all([
        fetchApi('/provisioned-directory').catch(() => []),
        fetchApi('/departments').catch(() => []),
        fetchApi('/batches').catch(() => []),
        fetchApi('/tutors').catch(() => []),
        fetchApi('/students').catch(() => [])
      ]);
      setProvisionedDirectory(dir || []);
      setDepartments(depts);
      setBatches(bats);
      setTutors(tuts);
      setStudents(studs);
      setProvisionPastedText('');
      setProvisionParsedUsers([]);
    } catch (err) {
      setError(err.message || 'Bulk provisioning failed.');
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleDownloadCredentialsSheet = (usersList) => {
    const colCode = college?.code || 'CAMPUS';
    let csv = 'Full Name,Email,Role,Department,Batch,Roll Number,Initial Password,Status\n';
    usersList.forEach(u => {
      csv += `"${u.name}","${u.email}","${u.role}","${u.department || ''}","${u.batch || ''}","${u.roll_number || ''}","${u.initial_password}","ACTIVE"\n`;
    });
    downloadCSV(`InterviewIQ_${colCode}_Credentials_Distribution.csv`, csv);
  };

  const handleResetUserPassword = async () => {
    if (!resetTargetUser) return;
    try {
      setError('');
      setLoading(true);
      const res = await fetchApi(`/users/${resetTargetUser.user_id}/reset-password`, 'POST', {
        temporary_password: tempPasswordInput.trim() || undefined
      });
      setResetResult(res);
      const dir = await fetchApi('/provisioned-directory').catch(() => []);
      setProvisionedDirectory(dir || []);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> College Admin Panel
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Manage resources and view analytics for your college.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-300 dark:border-white/10 pb-2 overflow-x-auto">
        {['overview', 'bulk-provision', 'college', 'departments', 'batches', 'tutors', 'students'].map(t => (
          <button 
            key={t}
            onClick={() => { setActiveTab(t); setError(''); setSelectedStudentId(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-white dark:bg-white/5'
            }`}
          >
            {t === 'bulk-provision' && <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            {t === 'bulk-provision' ? 'Bulk Onboarding' : t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {analyticsLoading.overview ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : (
            <>
              {overviewAnalytics && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Departments</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.departments}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Batches</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.batches}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Tutors</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.tutors}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Students</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.students}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Active Students</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.activeStudents}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Interviews</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.interviews?.total || 0}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Average Score</p>
                    <h3 className="text-2xl font-bold">
                      {overviewAnalytics.interviews?.averageScore !== null ? `${Math.round(overviewAnalytics.interviews.averageScore)}%` : 'N/A'}
                    </h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2">
                    <Code2 className="w-5 h-5 text-cyan-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Coding Solved</p>
                    <h3 className="text-2xl font-bold">{overviewAnalytics.coding?.totalSolved || 0}</h3>
                  </div>
                  <div className="glass-card p-4 rounded-2xl flex flex-col gap-2 col-span-2 md:col-span-1 xl:col-span-2">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Daily Task Completion</p>
                    <h3 className="text-2xl font-bold">
                      {overviewAnalytics.dailyTask?.completionRate !== null ? `${Math.round(overviewAnalytics.dailyTask.completionRate)}%` : '0%'}
                    </h3>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Domain Preparation</h3>
                  <div className="space-y-4">
                    {domainsAnalytics.length > 0 ? domainsAnalytics.map((domain, i) => (
                      <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">{domain.domain}</h4>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {domain.averageScore !== null ? `${Math.round(domain.averageScore)}% Avg` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {domain.students} Students</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> {domain.interviews} Interviews</span>
                        </div>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-slate-600 dark:text-slate-400">No domain activity yet.</div>
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Recent College Activity</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {activityAnalytics.length > 0 ? activityAnalytics.map((act, i) => (
                      <div key={i} className="flex gap-4 items-start bg-white dark:bg-white/5 p-4 rounded-xl">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          act.type === 'INTERVIEW' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                          act.type === 'CODING' ? 'bg-emerald-500/20 text-indigo-600 dark:text-indigo-400' :
                          'bg-amber-500/20 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {act.type === 'INTERVIEW' ? <MessageSquare className="w-5 h-5" /> : 
                           act.type === 'CODING' ? <Code2 className="w-5 h-5" /> : 
                           <BrainCircuit className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{act.title}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{act.studentName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {act.score !== null && <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{Math.round(act.score)}%</p>}
                          <p className="text-xs text-slate-500">{new Date(act.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-slate-600 dark:text-slate-400">No recent activity.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* BULK ONBOARDING & ROSTER PROVISIONING */}
      {activeTab === 'bulk-provision' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero-Friction Access
                </span>
                <span className="text-xs text-slate-500">Institution: {college?.name} ({college?.code})</span>
              </div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                Institutional Student & Faculty Roster Provisioning
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Upload your college roster to instantly create accounts for students and faculty. When they log in with their college credentials, the system automatically binds them to their designated department, batch, and curriculum.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleDownloadSampleCSV}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-2"
                title="Download standard template to populate your college roster"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                Download Template (.csv)
              </button>
            </div>
          </div>

          {/* Provisioning Success Summary Report */}
          {provisionSuccessReport && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm">
                    Roster Provisioning Successful! {provisionSuccessReport.provisionedCount} accounts activated.
                  </span>
                </div>
                <button
                  onClick={() => handleDownloadCredentialsSheet(provisionSuccessReport.users)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Credentials Sheet (.csv)
                </button>
              </div>
              <p className="text-xs text-emerald-300/80">
                All accounts have been linked to {college?.name}. Distribute the downloaded credentials sheet to your students and faculty so they can log in directly.
              </p>
              {provisionSuccessReport.errors?.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    {provisionSuccessReport.errors.length} Row(s) Skipped:
                  </span>
                  {provisionSuccessReport.errors.map((err, idx) => (
                    <p key={idx}>• Row {err.row} ({err.email}): {err.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dual Upload / Paste Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload Zone */}
            <div className="glass-card p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-indigo-400" /> Upload Roster File (.CSV)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Select a populated CSV roster file exported from your student management system or Excel.
                </p>
                <div className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-colors">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-xs font-bold text-indigo-400 hover:underline">Click to browse file</span>
                    <input 
                      type="file" 
                      accept=".csv,text/csv,text/plain" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">Supports standard CSV with UTF-8 encoding</p>
                </div>
              </div>

              {/* Security & Provisioning Options */}
              <div className="pt-4 border-t border-slate-300 dark:border-white/10 space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionForcePasswordChange}
                    onChange={(e) => setProvisionForcePasswordChange(e.target.checked)}
                    className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Require users to create personal password on first login (Recommended)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionAutoCreate}
                    onChange={(e) => setProvisionAutoCreate(e.target.checked)}
                    className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Auto-create missing departments & batches from roster</span>
                </label>
              </div>
            </div>

            {/* Quick Paste Zone */}
            <div className="glass-card p-6 rounded-2xl space-y-3 flex flex-col">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Or Quick Paste Tabular Data
                </h3>
                <button
                  onClick={() => handlePastedTextChange('')}
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Copy columns from Excel / Google Sheets and paste them directly:
              </p>
              <textarea
                rows={6}
                value={provisionPastedText}
                onChange={(e) => handlePastedTextChange(e.target.value)}
                placeholder="Full Name,Email,Initial Password,Role,Department,Batch,Roll Number&#10;Aarav Sharma,aarav@college.edu.in,Pass123,STUDENT,CSE,Batch 2027 CSE-A,2023-CS-001"
                className="w-full flex-1 p-3 rounded-xl bg-slate-900/50 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500/50 resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Supported columns: Name, Email, Password (optional), Role (Student/Teacher), Department, Batch, Roll Number.
              </p>
            </div>
          </div>

          {/* Live Preview Table of Parsed Users */}
          {provisionParsedUsers.length > 0 && (
            <div className="glass-card p-6 rounded-2xl space-y-4 border border-indigo-500/30 animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold">Roster Preview</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300">
                    {provisionParsedUsers.length} Total Records
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">
                    {provisionParsedUsers.filter(u => (u.role || '').toUpperCase() !== 'TEACHER' && (u.role || '').toUpperCase() !== 'TUTOR').length} Students
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300">
                    {provisionParsedUsers.filter(u => (u.role || '').toUpperCase() === 'TEACHER' || (u.role || '').toUpperCase() === 'TUTOR').length} Faculty
                  </span>
                </div>
                <button
                  onClick={handleExecuteBulkProvision}
                  disabled={provisionLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {provisionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning Accounts...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Execute Bulk Provisioning ({provisionParsedUsers.length})</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-white/10">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-400">
                    <tr>
                      <th className="p-3 font-semibold">#</th>
                      <th className="p-3 font-semibold">Full Name</th>
                      <th className="p-3 font-semibold">Institutional Email</th>
                      <th className="p-3 font-semibold">Role</th>
                      <th className="p-3 font-semibold">Department</th>
                      <th className="p-3 font-semibold">Batch</th>
                      <th className="p-3 font-semibold">Roll / ID</th>
                      <th className="p-3 font-semibold">Initial Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {provisionParsedUsers.slice(0, 10).map((u, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="p-3 text-slate-500">{i + 1}</td>
                        <td className="p-3 font-medium text-white">{u.name}</td>
                        <td className="p-3 text-indigo-400">{u.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (u.role || '').toUpperCase() === 'TEACHER' || (u.role || '').toUpperCase() === 'TUTOR'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {u.role || 'STUDENT'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{u.department || '—'}</td>
                        <td className="p-3 text-slate-300">{u.batch || '—'}</td>
                        <td className="p-3 font-mono text-slate-400">{u.roll_number || '—'}</td>
                        <td className="p-3 font-mono text-slate-400">
                          {u.password ? u.password : `${college?.code || 'CAMPUS'}@2026 (Auto)`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {provisionParsedUsers.length > 10 && (
                  <div className="p-2.5 text-center text-xs text-slate-500 bg-white/[0.01] border-t border-white/5">
                    Showing first 10 of {provisionParsedUsers.length} records. All will be provisioned.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Provisioned Campus Directory & Credentials Table */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Active Campus Directory & Credentials Management
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  View all provisioned students and faculty in your college with their live status and batch assignments.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder="Search name, email, roll..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-300 dark:border-white/10 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
                {/* Role Filter */}
                <select
                  value={directoryRoleFilter}
                  onChange={(e) => setDirectoryRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-300 dark:border-white/10 text-xs text-slate-200 outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="TUTOR">Faculty Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-white/10">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-400">
                  <tr>
                    <th className="p-3 font-semibold">Member</th>
                    <th className="p-3 font-semibold">Institutional Email</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Batch</th>
                    <th className="p-3 font-semibold">Security Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {provisionedDirectory
                    .filter(m => {
                      if (directoryRoleFilter !== 'ALL' && m.system_role !== directoryRoleFilter) return false;
                      if (!directorySearch.trim()) return true;
                      const q = directorySearch.toLowerCase();
                      return (
                        m.full_name?.toLowerCase().includes(q) ||
                        m.email?.toLowerCase().includes(q) ||
                        m.roll_number?.toLowerCase().includes(q)
                      );
                    })
                    .map((m) => (
                      <tr key={m.campus_user_id} className="hover:bg-white/[0.02]">
                        <td className="p-3">
                          <p className="font-semibold text-white">{m.full_name}</p>
                          {m.roll_number && (
                            <p className="text-[10px] text-slate-400 font-mono">Roll: {m.roll_number}</p>
                          )}
                        </td>
                        <td className="p-3 text-indigo-400">{m.institutional_email || m.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.system_role === 'TUTOR'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {m.system_role === 'TUTOR' ? 'FACULTY' : m.system_role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{m.department_code || m.department_name || '—'}</td>
                        <td className="p-3 text-slate-300">{m.batch_name || '—'}</td>
                        <td className="p-3">
                          {m.must_change_password ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Key className="w-3 h-3" /> Initial Password
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Personal Password Set
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setResetTargetUser(m);
                              setTempPasswordInput('');
                              setResetResult(null);
                              setShowResetModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  {provisionedDirectory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No members provisioned yet. Use the upload tool above to onboard your students and faculty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COLLEGE */}
      {activeTab === 'college' && college && (
        <div className="glass-card p-6 rounded-2xl max-w-2xl space-y-4">
          <h2 className="text-lg font-bold mb-4">College Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Name</p>
              <p className="text-base font-medium">{college.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Code</p>
              <p className="text-base font-medium">{college.code}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Domain</p>
              <p className="text-base font-medium">{college.domain || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Status</p>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${college.status === 'ACTIVE' ? 'bg-emerald-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                {college.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Departments</h2>
            <button 
              onClick={() => { setEditingDept(null); setShowDeptModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Add Department
            </button>
          </div>
          
          <div className="glass-card rounded-2xl overflow-hidden mt-4 overflow-x-auto">
            {analyticsLoading.departments ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Department</th>
                    <th className="p-4 font-semibold text-center">Batches</th>
                    <th className="p-4 font-semibold text-center">Students (Active)</th>
                    <th className="p-4 font-semibold text-center">Interviews</th>
                    <th className="p-4 font-semibold text-center">Avg Score</th>
                    <th className="p-4 font-semibold text-center">Coding Solved</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {departmentsAnalytics.map(d => (
                    <tr key={d.departmentId} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{d.department}</td>
                      <td className="p-4 text-center">{d.batches}</td>
                      <td className="p-4 text-center">{d.students} <span className="text-indigo-600 dark:text-indigo-400 text-xs">({d.activeStudents})</span></td>
                      <td className="p-4 text-center">{d.interviews}</td>
                      <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">{d.averageInterviewScore !== null ? `${Math.round(d.averageInterviewScore)}%` : 'N/A'}</td>
                      <td className="p-4 text-center text-cyan-400 font-medium">{d.codingSolved}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingDept(departments.find(dept => dept.id === d.departmentId)); setShowDeptModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!analyticsLoading.departments && departmentsAnalytics.length === 0 && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No departments yet.</div>}
          </div>
        </div>
      )}

      {/* BATCHES */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Batches</h2>
            <button 
              onClick={() => { setEditingBatch(null); setShowBatchModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Add Batch
            </button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden mt-4 overflow-x-auto">
            {analyticsLoading.batches ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Batch</th>
                    <th className="p-4 font-semibold">Dept / Year</th>
                    <th className="p-4 font-semibold text-center">Students (Active)</th>
                    <th className="p-4 font-semibold text-center">Interviews</th>
                    <th className="p-4 font-semibold text-center">Avg Score</th>
                    <th className="p-4 font-semibold text-center">Coding Solved</th>
                    <th className="p-4 font-semibold text-center">Daily Task</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batchesAnalytics.map(b => (
                    <tr key={b.batchId} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{b.batchName}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">{b.department} - {b.academicYear}</td>
                      <td className="p-4 text-center">{b.students} <span className="text-indigo-600 dark:text-indigo-400 text-xs">({b.activeStudents})</span></td>
                      <td className="p-4 text-center">{b.interviews}</td>
                      <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">{b.averageInterviewScore !== null ? `${Math.round(b.averageInterviewScore)}%` : 'N/A'}</td>
                      <td className="p-4 text-center text-cyan-400 font-medium">{b.codingSolved}</td>
                      <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">{Math.round(b.dailyTaskCompletionRate)}%</td>
                      <td className="p-4 text-right flex gap-3 justify-end items-center h-full">
                        <button onClick={() => openManageBatchTutors(batches.find(bx => bx.id === b.batchId))} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium text-xs">Tutors</button>
                        <button onClick={() => openManageBatchStudents(batches.find(bx => bx.id === b.batchId))} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium text-xs">Students</button>
                        <button onClick={() => { setEditingBatch(batches.find(bx => bx.id === b.batchId)); setShowBatchModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium text-xs">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!analyticsLoading.batches && batchesAnalytics.length === 0 && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No batch activity yet.</div>}
          </div>
        </div>
      )}

      {/* TUTORS */}
      {activeTab === 'tutors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Tutors</h2>
            <button 
              onClick={() => setShowTutorModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Tutor
            </button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden mt-4 overflow-x-auto">
            {analyticsLoading.tutors ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Tutor</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold text-center">Assigned Batches</th>
                    <th className="p-4 font-semibold text-center">Assigned Students</th>
                    <th className="p-4 font-semibold text-center">Student Interviews</th>
                    <th className="p-4 font-semibold text-center">Avg Student Score</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tutorsAnalytics.map(t => (
                    <tr key={t.tutorId} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{t.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">{t.email}</td>
                      <td className="p-4 text-center">{t.assignedBatches}</td>
                      <td className="p-4 text-center">{t.assignedStudents}</td>
                      <td className="p-4 text-center">{t.studentInterviews}</td>
                      <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">{t.averageStudentInterviewScore !== null ? `${Math.round(t.averageStudentInterviewScore)}%` : 'N/A'}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => toggleTutorStatus(tutors.find(tx => tx.user_id === t.tutorId))} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white font-medium text-xs">Toggle Status</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!analyticsLoading.tutors && tutorsAnalytics.length === 0 && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No tutor activity yet.</div>}
          </div>
        </div>
      )}

      {/* STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Students</h2>
            {selectedStudentId && (
              <button 
                onClick={() => setSelectedStudentId(null)}
                className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Back to List
              </button>
            )}
          </div>
          
          {selectedStudentId ? (
            <div className="space-y-6">
              {analyticsLoading.studentDetail ? (
                <div className="flex items-center justify-center p-12 glass-card rounded-2xl"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
              ) : studentDetail ? (
                <>
                  <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                      <h2 className="text-2xl font-bold">{studentDetail.student.name}</h2>
                      <p className="text-slate-600 dark:text-slate-400">{studentDetail.student.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-white dark:bg-white/5 rounded-md text-xs font-semibold">{studentDetail.academic.department}</span>
                        <span className="px-2 py-1 bg-white dark:bg-white/5 rounded-md text-xs font-semibold">{studentDetail.academic.batch}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Last Activity</p>
                      <p className="font-semibold">{studentDetail.activity.lastActivityAt ? new Date(studentDetail.activity.lastActivityAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><MessageSquare className="w-5 h-5" /> Interviews</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Total</span><span className="font-bold">{studentDetail.interviews.total}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Avg Score</span><span className="font-bold">{studentDetail.interviews.averageScore !== null ? `${Math.round(studentDetail.interviews.averageScore)}%` : 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Best Score</span><span className="font-bold">{studentDetail.interviews.bestScore !== null ? `${Math.round(studentDetail.interviews.bestScore)}%` : 'N/A'}</span></div>
                      </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-cyan-400"><Code2 className="w-5 h-5" /> Coding</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Total Solved</span><span className="font-bold">{studentDetail.coding.totalSolved}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Recent (7 Days)</span><span className="font-bold">{studentDetail.coding.recentSolved}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Last Solved</span><span className="font-bold text-sm">{studentDetail.coding.lastSolvedAt ? new Date(studentDetail.coding.lastSolvedAt).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><Target className="w-5 h-5" /> Daily Task</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Goal</span><span className="font-bold">{studentDetail.dailyTask.goal} problems</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Solved Today</span><span className="font-bold">{studentDetail.dailyTask.solvedToday}</span></div>
                        <div className="mt-4 pt-4 border-t border-slate-300 dark:border-white/10 flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">Status</span>
                          {studentDetail.dailyTask.completed ? (
                            <span className="px-2 py-1 bg-emerald-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">In Progress</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden mt-4 overflow-x-auto">
              {analyticsLoading.students ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="p-4 font-semibold">Student</th>
                      <th className="p-4 font-semibold">Dept / Batch</th>
                      <th className="p-4 font-semibold text-center">Interviews</th>
                      <th className="p-4 font-semibold text-center">Avg Score</th>
                      <th className="p-4 font-semibold text-center">Coding Solved</th>
                      <th className="p-4 font-semibold text-center">Daily Task</th>
                      <th className="p-4 font-semibold text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studentsAnalytics.map(s => (
                      <tr key={s.studentId} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-medium">
                          {s.name}
                          <div className="text-xs text-slate-500">{s.email}</div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">
                          {s.department}<br/>{s.batch}
                        </td>
                        <td className="p-4 text-center">{s.interviews}</td>
                        <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">{s.averageInterviewScore !== null ? `${Math.round(s.averageInterviewScore)}%` : 'N/A'}</td>
                        <td className="p-4 text-center text-cyan-400 font-medium">{s.codingSolved}</td>
                        <td className="p-4 text-center text-xs font-semibold">
                          {s.dailyTaskCompleted ? <span className="text-indigo-600 dark:text-indigo-400">Done</span> : <span className="text-slate-500">-</span>}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleSelectStudentDetail(s.studentId)} className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors inline-flex">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!analyticsLoading.students && studentsAnalytics.length === 0 && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No students enrolled yet.</div>}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Name</label>
                <input name="name" defaultValue={editingDept?.name} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Code</label>
                <input name="code" defaultValue={editingDept?.code} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingBatch ? 'Edit Batch' : 'Add Batch'}</h3>
            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Name</label>
                <input name="name" defaultValue={editingBatch?.name} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Academic Year</label>
                <input name="academic_year" defaultValue={editingBatch?.academic_year} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              {!editingBatch && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Department</label>
                  <select name="department_id" required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none">
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {editingBatch && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Status</label>
                  <select name="status" defaultValue={editingBatch.status} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowBatchModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTutorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add Tutor</h3>
            <form onSubmit={handleAddTutor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">User ID</label>
                <input name="userId" required placeholder="UUID of an existing user" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTutorModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assign Tutor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageBatchTutors && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Manage Tutors - {selectedBatch.name}</h3>
            
            <form onSubmit={assignTutorToBatch} className="flex gap-4 mb-6">
              <select name="tutorId" required className="flex-1 bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none">
                <option value="">Select a Tutor to Assign...</option>
                {tutors.filter(t => t.status === 'ACTIVE').map(t => (
                  <option key={t.user_id} value={t.user_id}>{t.full_name} ({t.email})</option>
                ))}
              </select>
              <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Assign
              </button>
            </form>

            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batchTutors.map(bt => (
                    <tr key={bt.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-medium">{bt.full_name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{bt.email}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => removeTutorFromBatch(bt.tutor_user_id)} className="text-red-400 hover:text-red-300 font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {batchTutors.length === 0 && (
                    <tr><td colSpan="3" className="p-4 text-center text-slate-600 dark:text-slate-400">No tutors assigned to this batch.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowManageBatchTutors(false)} className="px-6 py-2 rounded-lg font-semibold bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {showManageBatchStudents && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Manage Students - {selectedBatch.name}</h3>
            
            <form onSubmit={enrollStudentToBatch} className="flex gap-4 mb-6">
              <input name="studentId" required placeholder="User ID of student" className="flex-1 bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Enroll
              </button>
            </form>

            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-3 font-semibold">Student ID</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   <tr>
                     <td colSpan="2" className="p-4 text-center text-slate-600 dark:text-slate-400 text-xs">
                       View all students in the Students tab. To remove a student from this batch, use the form below.
                     </td>
                   </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Remove Student from Batch</h4>
              <div className="flex gap-4">
                <input id="removeStudentId" placeholder="User ID" className="flex-1 bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
                <button onClick={() => removeStudentFromBatch(document.getElementById('removeStudentId').value)} disabled={loading} className="bg-red-600/80 hover:bg-red-600 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Remove
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowManageBatchStudents(false)} className="px-6 py-2 rounded-lg font-semibold bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" /> Reset Temporary Password
              </h3>
              <button 
                onClick={() => { setShowResetModal(false); setResetResult(null); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <p className="text-xs text-slate-400">Target Member:</p>
              <p className="font-semibold text-sm text-white">{resetTargetUser.full_name}</p>
              <p className="text-xs text-indigo-400">{resetTargetUser.email}</p>
            </div>

            {resetResult ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-2 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-bold text-sm">Temporary Password Generated!</p>
                <div className="p-2.5 rounded-lg bg-black/40 font-mono text-sm tracking-wider text-emerald-300 font-bold select-all">
                  {resetResult.temporary_password}
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  Share this password with the user. They will be required to set their new personal password upon login.
                </p>
                <button
                  onClick={() => { setShowResetModal(false); setResetResult(null); }}
                  className="mt-3 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Custom Temporary Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    placeholder={`e.g. ${college?.code || 'CAMPUS'}@2026 or leave blank to auto-generate`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Leave blank to automatically generate a secure temporary password.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetUserPassword}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Confirm Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
