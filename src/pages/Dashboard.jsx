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

  // --- Authoritative Metrics matching Teacher and HR views ---
  const completedSessions = pastSessions.filter(s => s.status === 'COMPLETED' || (s.overall_score != null && s.status !== 'ABANDONED'));
  const totalCompleted = completedSessions.length;
  const totalSessions = pastSessions.length;

  const avgScore = totalCompleted > 0
    ? (completedSessions.reduce((sum, s) => sum + parseFloat(s.overall_score), 0) / totalCompleted).toFixed(1)
    : null;

  const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  // Categories practiced
  const categoriesSet = new Set(completedSessions.map(s => s.category || s.role).filter(Boolean));
  const categoriesList = [...categoriesSet].slice(0, 3);

  // Chart data — last 8 sessions in chronological order
  const chartData = pastSessions.slice(0, 8).reverse().map((sess, i) => ({
    name: `S${i + 1}`,
    score: sess.overall_score != null ? parseFloat(sess.overall_score) : null,
    date: sess.created_at
      ? new Date(sess.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : `Session ${i + 1}`
  })).filter(d => d.score != null);

  const hasData = totalCompleted > 0;

  // Empty state for new users
  if (!hasData) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Welcome Banner */}
        <div className="relative rounded-3xl p-8 lg:p-12 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200 dark:border-indigo-500/20 overflow-hidden text-center shadow-sm">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> AI Mock Interview Platform
          </div>
          <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white font-['Outfit'] tracking-tight mb-3">
            Welcome, <span className="gradient-text">{user?.name || user?.full_name || 'Candidate'}</span>!
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xl mx-auto mb-8 leading-relaxed font-medium">
            You haven't completed any interviews yet. Start your first AI-powered mock interview to build your confidence and track your progress.
          </p>
          <button
            onClick={() => {
              if (user) onNavigate('new-interview');
              else onNavigate('portal-selection');
            }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl glow-btn text-white font-black text-base shadow-xl hover:scale-105 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Start Your First Interview</span>
          </button>

          {/* Onboarding steps */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { step: '1', title: 'Choose a Category', desc: 'Backend, Frontend, System Design, HR, and more.', icon: Layers, color: 'violet' },
              { step: '2', title: 'Answer AI Questions', desc: 'Dynamic questions adapted to your experience level.', icon: Sparkles, color: 'blue' },
              { step: '3', title: 'Get Detailed Feedback', desc: 'Score breakdown, strengths, and areas to improve.', icon: CheckCircle2, color: 'emerald' }
            ].map(({ step, title, desc, icon: Icon, color }) => {
              const colorStyles = {
                violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-500/30 icon-bg:bg-violet-100 text-violet-700 dark:text-violet-300',
                blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30 icon-bg:bg-blue-100 text-blue-700 dark:text-blue-300',
                emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30 icon-bg:bg-emerald-100 text-emerald-700 dark:text-emerald-300'
              };
              return (
                <div key={step} className={`p-5 rounded-2xl border shadow-xs space-y-2.5 ${color === 'violet' ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-500/30' : color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${color === 'violet' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30' : color === 'blue' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'}`}>
                    {step}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Returning user with real data
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200 dark:border-indigo-500/20 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> AI Mock Interview Platform
            </div>
            <h1 className="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
              Welcome back, <span className="gradient-text">{user?.name || user?.full_name || 'Candidate'}</span>!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed font-medium">
              {avgScore
                ? <>Your overall average score is <span className="font-bold text-indigo-600 dark:text-indigo-400">{avgScore}%</span> across completed mock interviews.</>
                : <>You have <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalCompleted}</span> completed interview{totalCompleted !== 1 ? 's' : ''}.</>
              }
            </p>
          </div>

          <button
            onClick={() => onNavigate('new-interview')}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl glow-btn text-white font-black text-sm shadow-xl hover:scale-[1.02] transition-all shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start New Interview</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid - Colorful Pastel Surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Score - Violet Card */}
        <div className="p-5 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/30 shadow-sm shadow-violet-500/5 hover:-translate-y-1 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Average Score</p>
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Award className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-['Outfit']">
              {avgScore != null ? `${avgScore}%` : '—'}
            </h3>
            {avgScore != null && <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">Overall</span>}
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            {totalCompleted > 0 ? `Based on ${totalCompleted} completed session${totalCompleted !== 1 ? 's' : ''}` : 'Complete an interview to see your score'}
          </p>
        </div>

        {/* Completed Sessions - Cyan Card */}
        <div className="p-5 rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 shadow-sm shadow-cyan-500/5 hover:-translate-y-1 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Completed Sessions</p>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-['Outfit']">{totalCompleted}</h3>
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Interviews</span>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            {categoriesList.length > 0 ? categoriesList.join(', ') : 'Practice to track categories'}
          </p>
        </div>

        {/* Practice Time - Blue Card */}
        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 shadow-sm shadow-blue-500/5 hover:-translate-y-1 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Practice Time</p>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-['Outfit']">{totalMinutes}</h3>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Minutes</span>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            {totalCompleted > 0 ? `~${Math.round(totalMinutes / totalCompleted)} mins avg per session` : 'No sessions recorded yet'}
          </p>
        </div>

        {/* Score Trend - Orange Card */}
        <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 shadow-sm shadow-orange-500/5 hover:-translate-y-1 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Score Trend</p>
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {chartData.length >= 2 ? (() => {
              const diff = (chartData[chartData.length - 1].score - chartData[0].score).toFixed(1);
              const isUp = diff >= 0;
              return (
                <>
                  <h3 className={`text-2xl lg:text-3xl font-black font-['Outfit'] ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isUp ? '+' : ''}{diff}
                  </h3>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">pts growth</span>
                </>
              );
            })() : (
              <h3 className="text-2xl lg:text-3xl font-black text-slate-400 font-['Outfit']">—</h3>
            )}
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            {chartData.length >= 2 ? 'Across your sessions' : 'Need 2+ sessions to track'}
          </p>
        </div>
      </div>

      {/* Score Chart */}
      {chartData.length >= 2 && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-blue-50/70 dark:bg-slate-900/40 border border-indigo-200 dark:border-indigo-500/20 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Score Progression</h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Your interview performance trajectory over time</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30">
              {chartData.length} Data Points
            </span>
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
      <div className="rounded-3xl p-6 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/40 dark:bg-slate-900/40 border border-purple-200/80 dark:border-purple-500/20 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Recent Interviews</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Click any session to view the comprehensive AI evaluation</p>
          </div>
          <button onClick={() => onNavigate('history')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {pastSessions.slice(0, 4).map((sess) => (
            <div
              key={sess.id}
              onClick={() => { onSelectSessionReport(sess); onNavigate('report'); }}
              className="p-4 rounded-2xl bg-white dark:bg-white/5 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all flex items-center justify-between cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-black text-base flex items-center justify-center border border-violet-200 dark:border-violet-500/30 group-hover:scale-105 transition-transform">
                  {sess.overall_score != null ? parseFloat(sess.overall_score).toFixed(1) : '—'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-700 dark:text-indigo-300 transition-colors">
                    {sess.role || sess.category || 'Interview Session'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                    {sess.difficulty} • {sess.created_at ? new Date(sess.created_at).toLocaleDateString() : 'Recent'}
                    {sess.duration_minutes ? ` • ${sess.duration_minutes} mins` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30">
                  Completed
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {pastSessions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No interview history yet.</p>
            <button onClick={() => onNavigate('new-interview')} className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mx-auto">
              <Plus className="w-3.5 h-3.5" /> Start your first interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
