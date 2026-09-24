import React, { useState } from 'react';
import { useInterview } from '../context/InterviewContext';
import { History as HistoryIcon, Search, Filter, Calendar, Award, Clock, ChevronRight } from 'lucide-react';

export default function History({ onNavigate, onSelectSessionReport }) {
  const { pastSessions } = useInterview();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredSessions = pastSessions.filter(sess => {
    const roleName = sess.role || sess.category || '';
    const matchesSearch = roleName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (sess.difficulty || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || sess.category === filterRole || sess.roleId === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white font-['Outfit']">
            Interview Session Archive
          </h1>
          <p className="text-xs text-slate-400">Review past assessment reports, progress scores & AI suggestions</p>
        </div>

        <button
          onClick={() => onNavigate('new-interview')}
          className="px-5 py-2.5 rounded-xl glow-btn text-white text-xs font-bold shadow-lg"
        >
          Start New Interview
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role or difficulty..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 rounded-xl glass-input text-xs text-white focus:outline-none"
        >
          <option value="all" className="bg-slate-900">All Roles</option>
          <option value="backend" className="bg-slate-900">Backend Developer</option>
          <option value="frontend" className="bg-slate-900">Frontend Developer</option>
          <option value="system-design" className="bg-slate-900">System Design</option>
          <option value="hr" className="bg-slate-900">HR & Behavioral</option>
        </select>
      </div>

      {/* History Cards List */}
      <div className="space-y-3">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => { onSelectSessionReport(sess); onNavigate('report'); }}
              className="p-5 rounded-3xl glass-card glass-card-hover border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex flex-col items-center justify-center text-indigo-400">
                  <span className="text-xl font-black">{sess.overall_score || sess.overallScore || '-'}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                      {sess.role || sess.category}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {sess.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(sess.created_at || sess.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {sess.duration_minutes || sess.durationMinutes || 0} Mins</span>
                    <span>{sess.questionsCount || 10} Questions</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <span className="block text-xs font-bold text-emerald-400">{sess.scores?.accuracy || 8.5}/10 Accuracy</span>
                  <span className="text-[11px] text-slate-400">{sess.fillerWordsCount || 4} Fillers • {sess.avgWpm || 135} WPM</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 glass-card rounded-3xl border border-white/10">
            <HistoryIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No interview sessions found</p>
            <p className="text-xs text-slate-400">Try adjusting search query or start a new interview</p>
          </div>
        )}
      </div>
    </div>
  );
}
