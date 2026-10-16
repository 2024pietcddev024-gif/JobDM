import React, { useState, useEffect } from 'react';
import { Building2, Users, Layers, ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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

export default function RegistrarDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Data state
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  // Selections
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Modals / Forms
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [adminUserId, setAdminUserId] = useState('');

  const loadColleges = async () => {
    try {
      setLoading(true); setError('');
      const data = await fetchApi('/colleges');
      setColleges(data);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
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
      loadColleges();
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
      await loadColleges();
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const toggleCollegeStatus = async (col) => {
    try {
      setError(''); setLoading(true);
      const newStatus = col.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await fetchApi(`/colleges/${col.id}/status`, 'PATCH', { status: newStatus });
      await loadColleges();
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
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
      alert("College Admin assigned successfully!");
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const totalBatches = colleges.reduce((sum, col) => sum + (col.batchCount || 0), 0); // we don't have this statically, just approximation if we don't load all
  // For overview, we just use the length of lists we have, though proper stats would need a specific endpoint. 
  // For now, let's just display stats based on whatever is loaded or skip exact counts.
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Registrar Management
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Super Admin global configuration panel.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-300 dark:border-white/10 pb-2">
        {['overview', 'colleges', 'departments', 'batches', 'admins'].map(t => (
          <button 
            key={t}
            onClick={() => { setActiveTab(t); setError(''); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${
              activeTab === t ? 'bg-indigo-600 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-white dark:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Colleges</p>
              <h3 className="text-2xl font-bold">{colleges.length}</h3>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Active Colleges</p>
              <h3 className="text-2xl font-bold">{colleges.filter(c => c.status === 'ACTIVE').length}</h3>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Departments</p>
              <h3 className="text-2xl font-bold">-</h3>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Batches</p>
              <h3 className="text-2xl font-bold">-</h3>
            </div>
          </div>
        </div>
      )}

      {/* COLLEGES */}
      {activeTab === 'colleges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Colleges</h2>
            <button 
              onClick={() => { setEditingCollege(null); setShowCollegeModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Add College
            </button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Code</th>
                  <th className="p-4 font-semibold">Domain</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {colleges.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{c.code}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{c.domain || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button onClick={() => { setEditingCollege(c); setShowCollegeModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium">Edit</button>
                      <button onClick={() => toggleCollegeStatus(c)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white font-medium">Toggle Status</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {colleges.length === 0 && !loading && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No colleges found.</div>}
            {loading && <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}
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
              className="bg-[#0f172a] border border-slate-300 dark:border-white/10 text-sm rounded-lg px-4 py-2 text-slate-900 dark:text-white w-64 focus:border-indigo-500 outline-none"
            >
              <option value="">Select College...</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCollege && (
              <button 
                onClick={() => { setEditingDept(null); setShowDeptModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Add Department
              </button>
            )}
          </div>
          {selectedCollege && (
            <div className="glass-card rounded-2xl overflow-hidden mt-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Code</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {departments.map(d => (
                    <tr key={d.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{d.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{d.code}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingDept(d); setShowDeptModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {departments.length === 0 && !loading && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No departments found.</div>}
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
              className="bg-[#0f172a] border border-slate-300 dark:border-white/10 text-sm rounded-lg px-4 py-2 text-slate-900 dark:text-white w-64 focus:border-indigo-500 outline-none"
            >
              <option value="">Select College...</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCollege && (
              <button 
                onClick={() => { setEditingBatch(null); setShowBatchModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Add Batch
              </button>
            )}
          </div>
          {selectedCollege && (
            <div className="glass-card rounded-2xl overflow-hidden mt-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-white dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Academic Year</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-medium">{b.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{b.academic_year}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${b.status === 'ACTIVE' ? 'bg-emerald-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingBatch(b); setShowBatchModal(true); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {batches.length === 0 && !loading && <div className="p-8 text-center text-slate-600 dark:text-slate-400">No batches found.</div>}
            </div>
          )}
        </div>
      )}

      {/* ADMINS */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl max-w-lg">
            <h2 className="text-lg font-bold mb-4">Assign College Admin</h2>
            <form onSubmit={handleAssignAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">College</label>
                <select 
                  value={selectedCollege} 
                  onChange={e => setSelectedCollege(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
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
                  className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assign College Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showCollegeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingCollege ? 'Edit College' : 'Add College'}</h3>
            <form onSubmit={handleSaveCollege} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Name</label>
                <input name="name" defaultValue={editingCollege?.name} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Code</label>
                <input name="code" defaultValue={editingCollege?.code} required className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Domain (Optional)</label>
                <input name="domain" defaultValue={editingCollege?.domain} className="w-full bg-slate-50 dark:bg-[#080c14] border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCollegeModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors flex justify-center items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

    </div>
  );
}
