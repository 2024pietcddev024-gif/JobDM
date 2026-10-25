import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Layers, ShieldCheck, CheckCircle2, 
  XCircle, Loader2, Briefcase, Key, Copy, Check, Plus, 
  UserPlus, RefreshCw, GraduationCap 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fetchApi = async (path, method = 'GET', body = null) => {
  const token = localStorage.getItem('interviewiq_token');
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  
  const res = await fetch(`${API_URL}/campus/registrar${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Authentication required');
    if (res.status === 403) throw new Error('Unauthorized Access');
    if (res.status === 404) throw new Error('Resource not found');
    if (res.status === 409) throw new Error(data?.error || 'Duplicate or conflicting data');
    throw new Error(data?.error || `HTTP Error ${res.status}`);
  }
  return data;
};

export default function RegistrarDashboard({ initialTab = 'overview', onNavigate }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Data state
  const [colleges, setColleges] = useState([]);
  const [hrs, setHrs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  // Selections
  const [selectedCollege, setSelectedCollege] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Modals / Forms
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [adminUserId, setAdminUserId] = useState('');

  // HR Provisioning Modal
  const [showHRModal, setShowHRModal] = useState(false);
  const [hrTargetCollege, setHrTargetCollege] = useState('');
  const [hrFullName, setHrFullName] = useState('');
  const [provisionedHRResult, setProvisionedHRResult] = useState(null);

  // Teacher Provisioning Modal
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherTargetCollege, setTeacherTargetCollege] = useState('');
  const [teacherFullName, setTeacherFullName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const [colData, hrData, teacherData] = await Promise.all([
        fetchApi('/colleges-summary').catch(() => fetchApi('/colleges')),
        fetchApi('/hrs').catch(() => []),
        fetchApi('/teachers').catch(() => [])
      ]);
      setColleges(colData || []);
      setHrs(hrData || []);
      setTeachers(teacherData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async (colId) => {
    if (!colId) { setDepartments([]); return; }
    try {
      setLoading(true); setError('');
      const data = await fetchApi(`/colleges/${colId}/departments`);
      setDepartments(data);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const loadBatches = async (colId) => {
    if (!colId) { setBatches([]); return; }
    try {
      setLoading(true); setError('');
      const data = await fetchApi(`/colleges/${colId}/batches`);
      setBatches(data);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.campus?.role === 'SUPER_ADMIN') {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'departments' || activeTab === 'batches' || activeTab === 'admins') {
      if (selectedCollege) {
        loadDepartments(selectedCollege);
        loadBatches(selectedCollege);
      }
    }
  }, [activeTab, selectedCollege]);

  if (user?.campus?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Unauthorized</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">You do not have SUPER_ADMIN privileges.</p>
      </div>
    );
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveCollege = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), code: fd.get('code'), domain: fd.get('domain') };
    try {
      setError(''); setLoading(true);
      if (editingCollege) {
        await fetchApi(`/colleges/${editingCollege.id}`, 'PATCH', body);
      } else {
        await fetchApi('/colleges', 'POST', body);
      }
      setShowCollegeModal(false); setEditingCollege(null);
      await loadData();
      setSuccessMsg("College successfully saved!");
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const toggleCollegeStatus = async (col) => {
    try {
      setError(''); setLoading(true);
      const newStatus = col.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await fetchApi(`/colleges/${col.id}/status`, 'PATCH', { status: newStatus });
      await loadData();
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const toggleCampusUserStatus = async (campusUserId) => {
    try {
      setError(''); setLoading(true);
      await fetchApi(`/campus-users/${campusUserId}/toggle-status`, 'PATCH');
      await loadData();
      setSuccessMsg("User status updated successfully!");
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleProvisionHR = async (e) => {
    e.preventDefault();
    if (!hrTargetCollege || !hrFullName.trim()) {
      setError("Please select a college and enter the HR manager's name.");
      return;
    }
    try {
      setError(''); setLoading(true);
      const res = await fetchApi(`/colleges/${hrTargetCollege}/hr`, 'POST', { full_name: hrFullName.trim() });
      setProvisionedHRResult(res);
      setHrFullName('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionTeacher = async (e) => {
    e.preventDefault();
    if (!teacherTargetCollege || !teacherFullName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) {
      setError("All fields are required to provision a faculty member.");
      return;
    }
    try {
      setError(''); setLoading(true);
      const res = await fetchApi('/provision-teacher', 'POST', {
        collegeId: teacherTargetCollege,
        full_name: teacherFullName.trim(),
        email: teacherEmail.trim(),
        password: teacherPassword.trim()
      });
      setShowTeacherModal(false);
      setTeacherFullName('');
      setTeacherEmail('');
      setTeacherPassword('');
      await loadData();
      setSuccessMsg(res.message || "Teacher provisioned successfully!");
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!selectedCollege) return setError("Please select a college first.");
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), code: fd.get('code') };
    try {
      setError(''); setLoading(true);
      if (editingDept) {
        await fetchApi(`/departments/${editingDept.id}`, 'PATCH', body);
      } else {
        await fetchApi(`/colleges/${selectedCollege}/departments`, 'POST', body);
      }
      setShowDeptModal(false); setEditingDept(null);
      await loadDepartments(selectedCollege);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!selectedCollege) return setError("Please select a college first.");
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
        await fetchApi(`/colleges/${selectedCollege}/batches`, 'POST', body);
      }
      setShowBatchModal(false); setEditingBatch(null);
      await loadBatches(selectedCollege);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!selectedCollege) return setError("Please select a college first.");
    if (!adminUserId) return setError("Please enter a User ID.");
    try {
      setError(''); setLoading(true);
      await fetchApi(`/colleges/${selectedCollege}/admins`, 'POST', { userId: adminUserId });
      setAdminUserId('');
      setSuccessMsg("College Admin assigned successfully!");
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  // Aggregated Totals
  const totalStudents = colleges.reduce((sum, c) => sum + parseInt(c.student_count || 0, 10), 0);
  const totalTutors = colleges.reduce((sum, c) => sum + parseInt(c.tutor_count || 0, 10), 0);
  const totalHRs = colleges.reduce((sum, c) => sum + parseInt(c.hr_count || 0, 10), 0);
  const activeCollegesCount = colleges.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> Platform Super Admin & Licensing
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Global management portal to onboard colleges, provision HR accounts, assign faculty, and grant permissions.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-300 dark:border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'colleges', label: `Colleges (${colleges.length})` },
          { id: 'hrs', label: `HR Accounts (${hrs.length})` },
          { id: 'teachers', label: `Faculty / Teachers (${teachers.length})` },
          { id: 'departments', label: 'Departments' },
          { id: 'batches', label: 'Batches' },
          { id: 'admins', label: 'College Admins' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => { 
              setActiveTab(t.id); 
              setError(''); 
              if (onNavigate) onNavigate(t.id === 'overview' ? 'dashboard' : `registrar-${t.id}`);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors ${
              activeTab === t.id 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Colleges</p>
                <h3 className="text-2xl font-bold">{colleges.length}</h3>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{activeCollegesCount} Active Subscriptions</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">HR / Recruiters</p>
                <h3 className="text-2xl font-bold">{hrs.length}</h3>
                <span className="text-[11px] text-slate-500">Across {activeCollegesCount} organizations</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Faculty / Teachers</p>
                <h3 className="text-2xl font-bold">{teachers.length}</h3>
                <span className="text-[11px] text-slate-500">Assigned across batches</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Enrolled Students</p>
                <h3 className="text-2xl font-bold">{totalStudents}</h3>
                <span className="text-[11px] text-slate-500">Campus linked accounts</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-card p-6 rounded-3xl border border-slate-300 dark:border-white/10 space-y-4">
            <h3 className="text-lg font-bold">Quick Provisioning Actions</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              When closing a sale with a college or enterprise, generate authorized credentials instantly:
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setEditingCollege(null); setShowCollegeModal(true); }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Onboard New College
              </button>
              <button
                onClick={() => { setShowHRModal(true); setProvisionedHRResult(null); }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Briefcase className="w-4 h-4" /> Provision Company HR
              </button>
              <button
                onClick={() => setShowTeacherModal(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Add Faculty / Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLEGES */}
      {activeTab === 'colleges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Onboarded Colleges & Institutions</h2>
              <p className="text-xs text-slate-500">Manage client licenses, domains, codes, and permissions.</p>
            </div>
            <button 
              onClick={() => { setEditingCollege(null); setShowCollegeModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add College
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-300 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">College Name</th>
                  <th className="p-4 font-semibold">Access Code</th>
                  <th className="p-4 font-semibold">Email Domain</th>
                  <th className="p-4 font-semibold text-center">Students</th>
                  <th className="p-4 font-semibold text-center">Faculty</th>
                  <th className="p-4 font-semibold text-center">HR</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {colleges.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {c.code}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {c.domain ? `@${c.domain}` : <span className="text-slate-400">Not restricted</span>}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {c.student_count || 0}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {c.tutor_count || 0}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {c.hr_count || 0}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'ACTIVE' 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingCollege(c); setShowCollegeModal(true); }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-indigo-600 dark:text-indigo-400 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => toggleCollegeStatus(c)} 
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                        >
                          {c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {colleges.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-500">No colleges provisioned yet.</div>
            )}
            {loading && (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            )}
          </div>
        </div>
      )}

      {/* HR & COMPANIES */}
      {activeTab === 'hrs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Authorized HR Accounts</h2>
              <p className="text-xs text-slate-500">Enterprise recruitment partners and campus recruiters.</p>
            </div>
            <button 
              onClick={() => { setShowHRModal(true); setProvisionedHRResult(null); }}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" /> Provision New HR
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-300 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">HR Representative</th>
                  <th className="p-4 font-semibold">HR ID / Login Email</th>
                  <th className="p-4 font-semibold">Organization</th>
                  <th className="p-4 font-semibold">Company Code</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {hrs.map(h => (
                  <tr key={h.campus_user_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {h.full_name}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {h.email}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                      {h.college_name}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {h.college_code}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        h.status === 'ACTIVE' 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleCampusUserStatus(h.campus_user_id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          h.status === 'ACTIVE'
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {h.status === 'ACTIVE' ? 'Revoke Access' : 'Activate Access'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hrs.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-500">No HR accounts provisioned yet. Click "Provision New HR" to create one.</div>
            )}
          </div>
        </div>
      )}

      {/* TEACHERS & FACULTY */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Faculty & Teacher Accounts</h2>
              <p className="text-xs text-slate-500">Teachers with grading, batch oversight, and interview review permissions.</p>
            </div>
            <button 
              onClick={() => setShowTeacherModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Teacher
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-300 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Teacher Name</th>
                  <th className="p-4 font-semibold">Official Email</th>
                  <th className="p-4 font-semibold">Affiliated College</th>
                  <th className="p-4 font-semibold">College Code</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {teachers.map(t => (
                  <tr key={t.campus_user_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {t.full_name}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {t.email}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                      {t.college_name}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {t.college_code}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'ACTIVE' 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleCampusUserStatus(t.campus_user_id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          t.status === 'ACTIVE'
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {teachers.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-500">No teachers provisioned yet. Click "Add Teacher" to provision one.</div>
            )}
          </div>
        </div>
      )}

      {/* DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <select 
              value={selectedCollege} 
              onChange={e => setSelectedCollege(e.target.value)}
              className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 text-sm rounded-xl px-4 py-2.5 text-slate-900 dark:text-white w-72 focus:border-indigo-500 outline-none"
            >
              <option value="">Select College...</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCollege && (
              <button 
                onClick={() => { setEditingDept(null); setShowDeptModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Add Department
              </button>
            )}
          </div>
          {selectedCollege && (
            <div className="glass-card rounded-2xl overflow-hidden mt-4 border border-slate-300 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Code</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {departments.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{d.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{d.code}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingDept(d); setShowDeptModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {departments.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No departments found.</div>}
            </div>
          )}
        </div>
      )}

      {/* BATCHES */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <select 
              value={selectedCollege} 
              onChange={e => setSelectedCollege(e.target.value)}
              className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 text-sm rounded-xl px-4 py-2.5 text-slate-900 dark:text-white w-72 focus:border-indigo-500 outline-none"
            >
              <option value="">Select College...</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCollege && (
              <button 
                onClick={() => { setEditingBatch(null); setShowBatchModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Add Batch
              </button>
            )}
          </div>
          {selectedCollege && (
            <div className="glass-card rounded-2xl overflow-hidden mt-4 border border-slate-300 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Academic Year</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{b.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{b.academic_year}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-400'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingBatch(b); setShowBatchModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {batches.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No batches found.</div>}
            </div>
          )}
        </div>
      )}

      {/* ADMINS */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl max-w-lg border border-slate-300 dark:border-white/10">
            <h2 className="text-lg font-bold mb-2">Assign College Administrator</h2>
            <p className="text-xs text-slate-500 mb-4">Grant full campus administrative rights to an institutional head.</p>
            <form onSubmit={handleAssignAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">College</label>
                <select 
                  value={selectedCollege} 
                  onChange={e => setSelectedCollege(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                  required
                >
                  <option value="">Select College...</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">User ID</label>
                <input 
                  type="text" 
                  value={adminUserId}
                  onChange={e => setAdminUserId(e.target.value)}
                  placeholder="UUID of existing user"
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assign College Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROVISION HR MODAL */}
      {showHRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Provision HR / Recruiter Account
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Securely generate credentials for an enterprise partner or campus placement company.
            </p>

            {provisionedHRResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm">
                  <p className="font-bold flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Account Created Successfully!
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Send the following credentials to the HR / Recruiter. They can sign in immediately through the <strong>HR Login</strong> portal.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080c14] border border-slate-200 dark:border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">HR Login ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{provisionedHRResult.hr_id}</span>
                      <button 
                        onClick={() => copyToClipboard(provisionedHRResult.hr_id, 'hr_id')}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {copiedKey === 'hr_id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Company / College Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{provisionedHRResult.college_code}</span>
                      <button 
                        onClick={() => copyToClipboard(provisionedHRResult.college_code, 'code')}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Initial Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{provisionedHRResult.initial_password}</span>
                      <button 
                        onClick={() => copyToClipboard(provisionedHRResult.initial_password, 'pwd')}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {copiedKey === 'pwd' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      const text = `JobDM HR Credentials:\nPortal: HR Login\nHR ID: ${provisionedHRResult.hr_id}\nCompany Code: ${provisionedHRResult.college_code}\nInitial Password: ${provisionedHRResult.initial_password}`;
                      copyToClipboard(text, 'all');
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {copiedKey === 'all' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === 'all' ? 'Copied to Clipboard!' : 'Copy All Credentials'}
                  </button>
                </div>

                <button 
                  onClick={() => { setShowHRModal(false); setProvisionedHRResult(null); }}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleProvisionHR} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                    Select Organization / College
                  </label>
                  <select 
                    value={hrTargetCollege}
                    onChange={(e) => setHrTargetCollege(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">Choose organization...</option>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                    HR Manager Full Name
                  </label>
                  <input 
                    type="text"
                    required
                    value={hrFullName}
                    onChange={(e) => setHrFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar (Talent Acquisition)"
                    className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowHRModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-500 text-white transition-colors flex justify-center items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create HR Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PROVISION TEACHER MODAL */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Add Faculty / Teacher
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Provision a verified teacher account for a client college with full evaluation permissions.
            </p>

            <form onSubmit={handleProvisionTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                  College / Institution
                </label>
                <select 
                  value={teacherTargetCollege}
                  onChange={(e) => setTeacherTargetCollege(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                >
                  <option value="">Choose college...</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                  Teacher Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={teacherFullName}
                  onChange={(e) => setTeacherFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                  Teacher Official Email
                </label>
                <input 
                  type="email"
                  required
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="e.g. rsharma@piet.edu"
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                  Initial Password
                </label>
                <input 
                  type="text"
                  required
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="e.g. Teacher#2026"
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowTeacherModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Provision Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLEGE EDIT / ADD MODAL */}
      {showCollegeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingCollege ? 'Edit College' : 'Onboard New College'}</h3>
            <form onSubmit={handleSaveCollege} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">College / Institution Name</label>
                <input name="name" defaultValue={editingCollege?.name} required placeholder="e.g. Govt Engineering College" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Organization Code</label>
                <input name="code" defaultValue={editingCollege?.code} required placeholder="e.g. GEC-2026" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Institutional Domain (Optional)</label>
                <input name="domain" defaultValue={editingCollege?.domain} placeholder="e.g. gec.ac.in (without @)" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
                <p className="text-[10px] text-slate-500 mt-1">If provided, any student signing up with this email domain automatically links to this college.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCollegeModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Department Name</label>
                <input name="name" defaultValue={editingDept?.name} required placeholder="Computer Science & Engineering" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Department Code</label>
                <input name="code" defaultValue={editingDept?.code} required placeholder="CSE" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingBatch ? 'Edit Batch' : 'Add Batch'}</h3>
            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Batch Name</label>
                <input name="name" defaultValue={editingBatch?.name} required placeholder="e.g. 2022-2026 Batch A" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Academic Year</label>
                <input name="academic_year" defaultValue={editingBatch?.academic_year} required placeholder="2026" className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              {!editingBatch && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Department</label>
                  <select name="department_id" required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none">
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {editingBatch && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Status</label>
                  <select name="status" defaultValue={editingBatch.status} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowBatchModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
