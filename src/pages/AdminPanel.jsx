import React, { useState } from 'react';
import { SAMPLE_QUESTIONS_BANK } from '../mock/mockData';
import { 
  Shield, Activity, Plus, Search, Database, AlertTriangle
} from 'lucide-react';

export default function AdminPanel() {
  const [searchUser, setSearchUser] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionRole, setNewQuestionRole] = useState('backend');
  const [questionBank, setQuestionBank] = useState(SAMPLE_QUESTIONS_BANK);
  const [addedQuestions, setAddedQuestions] = useState([]);

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const newQ = {
      id: `q-custom-${Date.now()}`,
      question: newQuestionText,
      type: 'conceptual',
      topics: ['Admin Custom'],
      expectedKeywords: ['architecture', 'design'],
      role: newQuestionRole
    };

    setQuestionBank(prev => ({
      ...prev,
      [newQuestionRole]: [newQ, ...(prev[newQuestionRole] || [])]
    }));

    setAddedQuestions(prev => [newQ, ...prev]);
    setNewQuestionText('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" /> Administrator Suite
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white font-['Outfit']">
            Platform Admin
          </h1>
        </div>
      </div>

      {/* Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Admin Dashboard — Database Required</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time platform analytics (user count, interview stats, API usage) require a connected PostgreSQL database. 
            Configure <code className="text-indigo-300">DATABASE_URL</code> in your <code className="text-indigo-300">.env</code> file to enable these features.
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Status</span>
          <div className="text-lg font-extrabold text-rose-400 font-['Outfit'] flex items-center gap-2">
            <Database className="w-5 h-5" /> Not Connected
          </div>
          <p className="text-[11px] text-slate-500">Set a valid PostgreSQL DATABASE_URL</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question Templates</span>
          <div className="text-3xl font-extrabold text-white font-['Outfit']">
            {Object.values(questionBank).reduce((sum, arr) => sum + arr.length, 0)}
          </div>
          <p className="text-[11px] text-slate-400">In offline fallback bank</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Questions Added</span>
          <div className="text-3xl font-extrabold text-indigo-400 font-['Outfit']">{addedQuestions.length}</div>
          <p className="text-[11px] text-slate-400">This session</p>
        </div>
      </div>

      {/* Add Custom Question Template */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
        <h3 className="font-extrabold text-xl text-white font-['Outfit']">Add Custom Question Template</h3>
        
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Role</label>
              <select
                value={newQuestionRole}
                onChange={(e) => setNewQuestionRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white"
              >
                <option value="backend" className="bg-slate-900">Backend Developer</option>
                <option value="frontend" className="bg-slate-900">Frontend Developer</option>
                <option value="system-design" className="bg-slate-900">System Design</option>
                <option value="hr" className="bg-slate-900">HR & Behavioral</option>
                <option value="aiml" className="bg-slate-900">AI / ML Engineer</option>
                <option value="datascience" className="bg-slate-900">Data Science</option>
                <option value="software" className="bg-slate-900">General Software</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Question Text</label>
              <input
                type="text"
                required
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="e.g. How do you implement zero-downtime database migrations?"
                className="w-full px-4 py-2 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <button type="submit" className="px-5 py-2.5 rounded-xl glow-btn text-white font-bold text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Question Template</span>
          </button>
        </form>

        {addedQuestions.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-white/10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recently Added</p>
            {addedQuestions.map(q => (
              <div key={q.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 mt-0.5 whitespace-nowrap">{q.role}</span>
                <p className="text-xs text-slate-300">{q.question}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
