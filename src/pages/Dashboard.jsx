import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { 
  Play, Award, Clock, Flame, TrendingUp,
  CheckCircle2, Sparkles, ChevronRight, BookOpen, Layers, Plus
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function Dashboard({ onNavigate, onSelectSessionReport }) {
  const { user } = useAuth();
  const { pastSessions } = useInterview();

  // --- Compute all metrics from REAL data only ---
  const totalSessions = pastSessions.length;

  const sessionsWithScores = pastSessions.filter(s => s.overall_score != null);
  const avgScore = sessionsWithScores.length > 0
    ? (sessionsWithScores.reduce((sum, s) => sum + parseFloat(s.overall_score), 0) / sessionsWithScores.length).toFixed(1)
    : null;

  const totalMinutes = pastSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  // Categories practiced
  const categoriesSet = new Set(pastSessions.map(s => s.category || s.role).filter(Boolean));
  const categoriesList = [...categoriesSet].slice(0, 3);

  // Chart data — last 8 sessions in chronological order
  const chartData = pastSessions.slice(0, 8).reverse().map((sess, i) => ({
    name: `S${i + 1}`,
    score: sess.overall_score != null ? parseFloat(sess.overall_score) : null,
    date: sess.created_at
      ? new Date(sess.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : `Session ${i + 1}`
  })).filter(d => d.score != null);

  const hasData = totalSessions > 0;

  // Empty state for new users
  if (!hasData) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Welcome Banner */}
        <div className="relative glass-card rounded-3xl p-8 lg:p-12 border border-indigo-500/20 overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -z-10" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> AI Mock Interview Platform
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-white font-['Outfit'] tracking-tight mb-3">
            Welcome, <span className="gradient-text">{user?.name || user?.full_name || 'Candidate'}</span>!
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
            You haven't completed any interviews yet. Start your first AI-powered mock interview to build your confidence and track your progress.
          </p>
          <button
            onClick={() => onNavigate('new-interview')}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl glow-btn text-white font-extrabold text-base shadow-2xl hover:scale-105 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Start Your First Interview</span>
          </button>

          {/* Onboarding steps */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { step: '1', title: 'Choose a Category', desc: 'Backend, Frontend, System Design, HR, and more.', icon: Layers },
              { step: '2', title: 'Answer AI Questions', desc: 'Dynamic questions adapted to your experience level.', icon: Sparkles },
              { step: '3', title: 'Get Detailed Feedback', desc: 'Score breakdown, strengths, and areas to improve.', icon: CheckCircle2 }
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                  {step}
                </div>
                <h4 className="font-bold text-white text-sm">{title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Returning user with real data
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> AI Mock Interview Platform
            </div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
              Welcome back, <span className="gradient-text">{user?.name || user?.full_name || 'Candidate'}</span>!
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              {avgScore
                ? <>Your overall average score is <span className="font-bold text-indigo-400">{avgScore} / 10</span>. Keep practicing to improve!</>
                : <>You have <span className="font-bold text-indigo-400">{totalSessions}</span> interview session{totalSessions !== 1 ? 's' : ''} completed.</>
              }
            </p>
          </div>

          <button
            onClick={() => onNavigate('new-interview')}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl glow-btn text-white font-extrabold text-sm shadow-xl hover:scale-[1.02] transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start New Interview</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-['Outfit']">
              {avgScore ?? '—'}
            </span>
            {avgScore && <span className="text-xs font-medium text-slate-400">/ 10</span>}
          </div>
          <p className="text-[11px] text-slate-400">
            {sessionsWithScores.length > 0 ? `Based on ${sessionsWithScores.length} scored session${sessionsWithScores.length !== 1 ? 's' : ''}` : 'Complete an interview to see your score'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Sessions</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-['Outfit']">{totalSessions}</span>
            <span className="text-xs font-medium text-slate-400">Interviews</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {categoriesList.length > 0 ? categoriesList.join(', ') : 'Keep practicing!'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Practice Time</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-['Outfit']">{totalMinutes}</span>
            <span className="text-xs font-medium text-slate-400">Minutes</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {totalSessions > 0 ? `~${Math.round(totalMinutes / totalSessions)} mins avg per session` : 'No sessions yet'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score Trend</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {chartData.length >= 2 ? (() => {
              const diff = (chartData[chartData.length - 1].score - chartData[0].score).toFixed(1);
              const isUp = diff >= 0;
              return (
                <>
                  <span className={`text-3xl font-extrabold font-['Outfit'] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{diff}
                  </span>
                  <span className="text-xs font-medium text-slate-400">pts growth</span>
                </>
              );
            })() : (
              <span className="text-xl font-extrabold text-slate-400 font-['Outfit']">—</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {chartData.length >= 2 ? 'Across your sessions' : 'Need 2+ sessions to track'}
          </p>
        </div>
      </div>

      {/* Score Chart */}
      {chartData.length >= 2 && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div>
            <h3 className="font-extrabold text-lg text-white font-['Outfit']">Score Progression</h3>
            <p className="text-xs text-slate-400">Your interview performance over time</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  formatter={(val) => [`${val} / 10`, 'Overall Score']}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Interview History */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-white font-['Outfit']">Recent Interviews</h3>
          <button onClick={() => onNavigate('history')} className="text-xs font-bold text-indigo-400 hover:underline">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {pastSessions.slice(0, 4).map((sess) => (
            <div
              key={sess.id}
              onClick={() => { onSelectSessionReport(sess); onNavigate('report'); }}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm">
                  {sess.overall_score != null ? parseFloat(sess.overall_score).toFixed(1) : '—'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                    {sess.role || sess.category || 'Interview Session'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {sess.difficulty} • {sess.created_at ? new Date(sess.created_at).toLocaleDateString() : 'Unknown date'}
                    {sess.duration_minutes ? ` • ${sess.duration_minutes} mins` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  Completed
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </div>
            </div>
          ))}
        </div>

        {pastSessions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No interview history yet.</p>
            <button onClick={() => onNavigate('new-interview')} className="mt-3 text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1 mx-auto">
              <Plus className="w-3.5 h-3.5" /> Start your first interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
