import React, { useState, useEffect } from 'react';
import { useInterview } from '../context/InterviewContext';
import { History as HistoryIcon, Search, Calendar, Clock, ChevronRight, ShieldAlert, CheckCircle2, Code, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function History({ onNavigate, onSelectSessionReport }) {
  const { pastSessions } = useInterview();
  const [activeTab, setActiveTab] = useState('interviews'); // 'interviews' | 'coding'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [codingSessions, setCodingSessions] = useState([]);
  const [loadingCoding, setLoadingCoding] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('interviewiq_token');
    if (!token) return;
    setLoadingCoding(true);
    fetch(`${API_URL}/code/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setCodingSessions(data.sessions);
      })
      .catch(err => console.error('Failed to load coding history:', err))
      .finally(() => setLoadingCoding(false));
  }, []);

  const filteredSessions = pastSessions.filter(sess => {
    const roleName = sess.role || sess.category || '';
    const matchesSearch = roleName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (sess.difficulty || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || sess.category === filterRole || sess.roleId === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredCodingSessions = codingSessions.filter(sess => {
    const title = sess.problem_title || '';
    const topic = sess.topic || '';
    const lang = sess.language || '';
    const diff = sess.difficulty || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lang.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          diff.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
            Activity & Session Archive
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">Review past assessment reports, coding challenges, progress scores & policy records</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('coding-sandbox')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5" /> Practice Coding
          </button>
          <button
            onClick={() => onNavigate('new-interview')}
            className="px-5 py-2.5 rounded-xl glow-btn text-white text-xs font-bold shadow-lg"
          >
            Start New Interview
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-pink-200 dark:border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'interviews'
              ? 'border-pink-500 text-pink-700 dark:text-pink-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HistoryIcon className="w-4 h-4" /> Mock Interviews ({pastSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('coding')}
          className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'coding'
              ? 'border-pink-500 text-pink-700 dark:text-pink-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4" /> Coding Practice ({codingSessions.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-pink-50/80 via-purple-50/50 to-indigo-50/80 dark:bg-slate-900/40 border border-pink-200 dark:border-pink-500/20 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-pink-600 dark:text-pink-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'interviews' ? "Search by role or difficulty..." : "Search by problem title, topic, or language..."}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
          />
        </div>

        {activeTab === 'interviews' && (
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 font-medium"
          >
            <option value="all" className="bg-white dark:bg-slate-900">All Roles</option>
            <option value="backend" className="bg-white dark:bg-slate-900">Backend Developer</option>
            <option value="frontend" className="bg-white dark:bg-slate-900">Frontend Developer</option>
            <option value="system-design" className="bg-white dark:bg-slate-900">System Design</option>
            <option value="hr" className="bg-white dark:bg-slate-900">HR & Behavioral</option>
          </select>
        )}
      </div>

      {/* Content for Interviews Tab */}
      {activeTab === 'interviews' && (
        <div className="space-y-3">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((sess) => {
              const hasViolations = (sess.tab_switch_count > 0 || sess.clipboard_violation_count > 0 || sess.status === 'TERMINATED');
              const isTerminated = sess.status === 'TERMINATED';

              return (
                <div
                  key={sess.id}
                  onClick={() => { onSelectSessionReport(sess); onNavigate('report'); }}
                  className="p-5 rounded-3xl bg-pink-50/80 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-500/30 hover:border-pink-400 dark:hover:border-pink-500/50 hover:bg-pink-100/50 dark:hover:bg-pink-900/30 transition-all flex flex-col justify-between gap-4 cursor-pointer group shadow-sm hover:-translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-pink-100 dark:bg-pink-500/20 border border-pink-200 dark:border-pink-500/30 flex flex-col items-center justify-center text-pink-700 dark:text-pink-300 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                        <span className="text-xl font-black font-['Outfit']">{sess.overall_score || sess.overallScore || '-'}</span>
                        <span className="text-[9px] uppercase font-bold text-pink-600 dark:text-pink-400">Score</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-pink-700 dark:group-hover:text-pink-300 transition-colors">
                            {sess.role || sess.category}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30">
                            {sess.difficulty}
                          </span>
                          {isTerminated ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Terminated (Policy Violation)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-3 font-medium flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-pink-500" /> {new Date(sess.created_at || sess.date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-pink-500" /> {sess.duration_minutes || sess.durationMinutes || 0} Mins</span>
                          <span>{sess.questionsCount || (sess.questions_history ? sess.questions_history.length : 10)} Questions</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="hidden md:block text-right">
                        <span className="block text-xs font-bold text-pink-700 dark:text-pink-300">{sess.scores?.accuracy || 8.5}/10 Accuracy</span>
                        <span className="text-[11px] text-slate-500 font-medium">{sess.fillerWordsCount || 4} Fillers • {sess.avgWpm || 135} WPM</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-pink-400 group-hover:text-pink-700 dark:group-hover:text-white group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Anti-Cheating Violation Audit Notice */}
                  {hasViolations ? (
                    <div className="pt-2 border-t border-pink-200/60 dark:border-pink-500/20 flex flex-wrap items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-bold">Policy violation recorded:</span>
                      {sess.tab_switch_count > 0 && (
                        <span className="bg-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          Tab Switches: {sess.tab_switch_count}
                        </span>
                      )}
                      {sess.clipboard_violation_count > 0 && (
                        <span className="bg-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          Clipboard Actions: {sess.clipboard_violation_count}
                        </span>
                      )}
                      {sess.termination_reason && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold ml-auto">
                          Reason: {sess.termination_reason}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>No policy violations recorded</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-pink-50/40 dark:bg-slate-900/40 rounded-3xl border border-pink-200 dark:border-pink-500/20 shadow-sm">
              <HistoryIcon className="w-10 h-10 text-pink-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">No interview sessions found</p>
              <p className="text-xs text-slate-500 mt-0.5">Try adjusting search query or start a new interview session</p>
            </div>
          )}
        </div>
      )}

      {/* Content for Coding Practice Tab */}
      {activeTab === 'coding' && (
        <div className="space-y-3">
          {loadingCoding ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading coding activity archive...</div>
          ) : filteredCodingSessions.length > 0 ? (
            filteredCodingSessions.map((sess) => {
              const hasViolations = (sess.tab_switch_count > 0 || sess.clipboard_violation_count > 0 || sess.session_status === 'TERMINATED');
              const isTerminated = sess.session_status === 'TERMINATED';
              const isCompleted = sess.session_status === 'COMPLETED';

              return (
                <div
                  key={sess.session_id}
                  className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300 shadow-xs shrink-0">
                        <Code className="w-6 h-6" />
                        <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{sess.language || 'Code'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                            {sess.problem_title || 'Coding Challenge'}
                          </h3>
                          {sess.difficulty && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10">
                              {sess.difficulty}
                            </span>
                          )}
                          {sess.topic && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                              {sess.topic}
                            </span>
                          )}
                          {isTerminated ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Terminated (Policy Violation)
                            </span>
                          ) : isCompleted ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Solved & Completed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              Active / In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-3 font-medium flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> {new Date(sess.created_at).toLocaleDateString()}</span>
                          <span>{sess.attempts?.length || 0} Submissions</span>
                          {sess.attempts?.[0] && (
                            <span className="text-slate-500">Latest Verdict: <strong>{sess.attempts[0].status}</strong></span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onNavigate('coding-sandbox')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        Open Problem <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Anti-Cheating Violation Notice */}
                  {hasViolations ? (
                    <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-500/20 flex flex-wrap items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-bold">Policy violation recorded:</span>
                      {sess.tab_switch_count > 0 && (
                        <span className="bg-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          Tab Switches: {sess.tab_switch_count}
                        </span>
                      )}
                      {sess.clipboard_violation_count > 0 && (
                        <span className="bg-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          Clipboard Actions: {sess.clipboard_violation_count}
                        </span>
                      )}
                      {sess.termination_reason && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold ml-auto">
                          Reason: {sess.termination_reason}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>No policy violations recorded</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-indigo-50/40 dark:bg-slate-900/40 rounded-3xl border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
              <Code className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">No coding practice sessions found</p>
              <p className="text-xs text-slate-500 mt-0.5">Solve challenges in Coding Sandbox to build your practice history</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
