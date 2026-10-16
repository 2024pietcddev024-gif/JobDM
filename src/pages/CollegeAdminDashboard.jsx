import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Layers, ShieldCheck, CheckCircle2, 
  XCircle, Loader2, UserPlus, Trash2, GraduationCap,
  Activity, BrainCircuit, Code2, LineChart, PieChart, Star, Target, TrendingUp, Trophy, Zap, MessageSquare, Briefcase, Calendar, ChevronRight
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
        {['overview', 'college', 'departments', 'batches', 'tutors', 'students'].map(t => (
          <button 
            key={t}
            onClick={() => { setActiveTab(t); setError(''); setSelectedStudentId(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
              activeTab === t ? 'bg-indigo-600 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-white dark:bg-white/5'
            }`}
          >
            {t}
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

    </div>
  );
}
