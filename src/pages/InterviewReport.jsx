import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { 
  Award, Download, ArrowLeft, CheckCircle2, AlertCircle, 
  Sparkles, MessageSquare, Mic, BookOpen, ChevronDown, ChevronUp,
  Target, TrendingUp, AlertTriangle, SkipForward, ThumbsUp, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { API_URL } from '../services/apiClient';

function ScoreBadge({ score }) {
  const s = parseFloat(score);
  if (!score && score !== 0) return <span className="text-slate-500 font-bold">—</span>;
  const color = s >= 8 ? 'text-indigo-600 dark:text-indigo-400' : s >= 6 ? 'text-indigo-600 dark:text-indigo-400' : s >= 4 ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400';
  return <span className={`font-bold ${color}`}>{s.toFixed(1)}</span>;
}

function ScoreRing({ score, size = 80 }) {
  const s = parseFloat(score || 0);
  const pct = (s / 10) * 100;
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (pct / 100) * circumference;
  const color = s >= 8 ? '#10b981' : s >= 6 ? '#6366f1' : s >= 4 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
      <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="40" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="Outfit, sans-serif">
        {s > 0 ? s.toFixed(1) : '—'}
      </text>
    </svg>
  );
}

export default function InterviewReport({ onNavigate }) {
  const { user } = useAuth();
  const { finalReport, resetInterview } = useInterview();
  const [expandedQ, setExpandedQ] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  useEffect(() => {
    if (finalReport) {
      setReportData(finalReport);
    }
  }, [finalReport]);

  const handleStartNew = () => {
    resetInterview();
    onNavigate('new-interview');
  };

  if (!reportData) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-600 dark:text-slate-400 text-sm">No report available yet. Complete an interview first.</p>
        <button onClick={() => onNavigate('new-interview')} className="px-6 py-2.5 rounded-xl glow-btn text-white font-bold text-sm">
          Start New Interview
        </button>
      </div>
    );
  }

  const { session, questionsHistory = [], overallScore } = reportData;
  const validQAs = questionsHistory.filter(qa => qa.question);
  const answeredQAs = validQAs.filter(qa => !qa.skipped && (qa.answer?.trim() || qa.code?.trim()));
  const skippedCount = validQAs.filter(qa => qa.skipped).length;
  const emptyCount = validQAs.filter(qa => !qa.skipped && !qa.answer?.trim() && !qa.code?.trim()).length;

  const avgAccuracy = answeredQAs.length > 0
    ? (answeredQAs.reduce((s, qa) => s + parseFloat(qa.evaluation?.accuracy || 0), 0) / answeredQAs.length).toFixed(1) : '—';
  const avgComm = answeredQAs.length > 0
    ? (answeredQAs.reduce((s, qa) => s + parseFloat(qa.evaluation?.communication || 0), 0) / answeredQAs.length).toFixed(1) : '—';
  const avgConf = answeredQAs.length > 0
    ? (answeredQAs.reduce((s, qa) => s + parseFloat(qa.evaluation?.confidence || 0), 0) / answeredQAs.length).toFixed(1) : '—';
  const avgDepth = answeredQAs.length > 0
    ? (answeredQAs.reduce((s, qa) => s + parseFloat(qa.evaluation?.depth || 0), 0) / answeredQAs.length).toFixed(1) : '—';

  // Collect all improvements and strengths across questions
  const allImprovements = validQAs.flatMap(qa => qa.evaluation?.improvements || []);
  const allStrengths = validQAs.flatMap(qa => qa.evaluation?.strengths || []);

  // Collect missed keywords across questions
  const missedTopics = [...new Set(
    validQAs.flatMap(qa => {
      const kws = qa.question?.expectedKeywords || [];
      const ans = (qa.answer || '').toLowerCase();
      return kws.filter(k => !ans.includes(k.toLowerCase()));
    })
  )].slice(0, 8);

  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealCategory, setAppealCategory] = useState('TECHNICAL_ACCURACY');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState('');
  const [appealError, setAppealError] = useState('');

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!session?.id) return;
    setIsSubmittingAppeal(true);
    setAppealError('');
    setAppealSuccess('');
    try {
      const token = localStorage.getItem('interviewiq_token');
      const res = await fetch(`${API_URL}/interviews/session/${session.id}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: appealCategory,
          reason: appealReason
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAppealError(data.error || 'Failed to submit appeal');
      } else {
        setAppealSuccess('Appeal submitted successfully! An academic evaluator will review your response.');
        setAppealReason('');
        setTimeout(() => setShowAppealModal(false), 2500);
      }
    } catch {
      setAppealError('Network error while submitting appeal');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const readiness = parseFloat(overallScore) >= 8.5 ? 'Exemplary Mastery'
    : parseFloat(overallScore) >= 7.0 ? 'Proficient'
    : parseFloat(overallScore) >= 5.0 ? 'Developing'
    : overallScore ? 'Needs Practice' : 'Incomplete';

  const readinessColor = readiness === 'Exemplary Mastery' ? 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/20 bg-emerald-500/10'
    : readiness === 'Proficient' ? 'text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/20 bg-indigo-500/10'
    : readiness === 'Developing' ? 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/20 bg-amber-500/10'
    : 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/20 bg-rose-500/10';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Action Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <button onClick={handleStartNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glow-btn text-white font-bold text-xs shadow-xl">
          <Sparkles className="w-4 h-4" /> Start New Interview
        </button>
      </div>

      {/* Practice Notice Banner */}
      <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Formative Practice Feedback
          </p>
          <p>
            Scores reflect diagnostic practice metrics on job-related criteria. This is NOT an automated hiring decision. Official recruitment decisions are determined exclusively by human evaluators.
          </p>
        </div>
        <button
          onClick={() => setShowAppealModal(true)}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 transition-colors"
        >
          Request Human Review / Appeal
        </button>
      </div>

      {/* Hero Score Banner */}
      <div className="rounded-3xl p-6 lg:p-8 bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-500/30 overflow-hidden space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            {session?.status === 'TERMINATED' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-bold shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Session Terminated Early (Proctoring Violation Limit Exceeded)
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-500/20 border border-fuchsia-200 dark:border-fuchsia-500/30 text-fuchsia-800 dark:text-fuchsia-200 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400" /> AI Practice Session Complete
              </div>
            )}
            <h1 className="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
              {session?.role || session?.category || 'Interview'} Practice Report
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {session?.difficulty} Level • {validQAs.length} Questions • 
              {skippedCount > 0 ? ` ${skippedCount} Skipped •` : ''}
              {emptyCount > 0 ? ` ${emptyCount} Unanswered •` : ''}
              {new Date(session?.completedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <ScoreRing score={overallScore} size={90} />
            <div>
              <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Practice Readiness</span>
              <span className={`mt-1 px-3 py-1 rounded-xl border text-sm font-black ${readinessColor}`}>{readiness}</span>
            </div>
          </div>
        </div>

        {/* 4 Dimensional Averages */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Accuracy', val: avgAccuracy, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30' },
            { label: 'Communication', val: avgComm, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50/80 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30' },
            { label: 'Confidence', val: avgConf, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30' },
            { label: 'Depth', val: avgDepth, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50/80 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-500/30' },
          ].map(d => (
            <div key={d.label} className={`p-3.5 rounded-2xl border text-center shadow-xs ${d.bg}`}>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{d.label}</span>
              <span className={`text-2xl font-black font-['Outfit'] ${d.color}`}>{d.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proctoring & Integrity Status */}
      <div className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-4 text-xs ${
        (session?.proctoring_violations_count > 0 || session?.status === 'TERMINATED')
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
          : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            (session?.proctoring_violations_count > 0 || session?.status === 'TERMINATED')
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}>
            {(session?.proctoring_violations_count > 0 || session?.status === 'TERMINATED') ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              {(session?.status === 'TERMINATED')
                ? 'Proctoring Status: Session Terminated'
                : (session?.proctoring_violations_count > 0)
                  ? 'Proctoring Status: Warnings Logged'
                  : 'Proctoring Status: Integrity Verified'}
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              {session?.status === 'TERMINATED'
                ? (session?.termination_reason || 'Interview was cancelled due to repeated security/proctoring violations.')
                : (session?.proctoring_violations_count > 0)
                  ? `${session.proctoring_violations_count} security warning(s) were flagged during the session.`
                  : 'Continuous face scan and single-speaker voice detection passed with zero security flags.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <span>Camera &amp; Face: <strong>{session?.face_violation_count ? `${session.face_violation_count} warning(s)` : 'Clear'}</strong></span>
          <span>Voice: <strong>{session?.voice_violation_count ? `${session.voice_violation_count} warning(s)` : 'Clear'}</strong></span>
          <span>Tab Switches: <strong>{session?.tab_switch_count || 0}</strong></span>
        </div>
      </div>

      {/* Strengths + Improvement Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
            <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Key Strengths
          </div>
          <ul className="space-y-2">
            {allStrengths.length > 0 ? [...new Set(allStrengths)].slice(0, 6).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span> {s}
              </li>
            )) : (
              <li className="text-xs text-slate-500">Complete more questions to see your strengths.</li>
            )}
          </ul>
        </div>
        <div className="rounded-3xl p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400" /> What to Improve
          </div>
          <ul className="space-y-2">
            {allImprovements.length > 0 ? [...new Set(allImprovements)].slice(0, 6).map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">→</span> {imp}
              </li>
            )) : (
              <li className="text-xs text-slate-500">Great job! No major improvements flagged.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Topics to Study */}
      {missedTopics.length > 0 && (
        <div className="rounded-3xl p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Topics to Study Before Your Real Interview
          </div>
          <div className="flex flex-wrap gap-2">
            {missedTopics.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold">{t}</span>
            ))}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">These key concepts appeared in questions but were not mentioned in your answers. Study them to improve your score.</p>
        </div>
      )}

      {/* Question-by-Question Breakdown */}
      <div className="rounded-3xl p-6 lg:p-8 bg-sky-50/80 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-500/30 space-y-4 shadow-sm">
        <h3 className="font-extrabold text-xl text-slate-900 dark:text-white font-['Outfit']">Question-by-Question Breakdown</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Click any question to see your answer, score, and the correct model answer.</p>

        <div className="space-y-3">
          {validQAs.map((qa, idx) => {
            const eval_ = qa.evaluation || {};
            const score = eval_.overall;
            const isOpen = expandedQ === idx;
            const isSkipped = qa.skipped;
            const isEmpty = !isSkipped && !qa.answer?.trim() && !qa.code?.trim();

            return (
              <div key={idx} className={`rounded-2xl border transition-all ${isOpen ? 'bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-500/30 shadow-md' : 'bg-white/80 dark:bg-white/5 border-sky-200/60 dark:border-white/10 hover:border-sky-400 dark:hover:border-white/20'}`}>
                {/* Question Header Row */}
                <button
                  className="w-full flex items-center justify-between gap-4 p-4 text-left"
                  onClick={() => setExpandedQ(isOpen ? null : idx)}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-black text-xs flex items-center justify-center border border-sky-200 dark:border-sky-500/30 flex-shrink-0">
                      Q{idx + 1}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{qa.question?.question || qa.question?.question_text}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isSkipped ? (
                      <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30">
                        <SkipForward className="w-3 h-3 text-amber-600" /> Skipped
                      </span>
                    ) : isEmpty ? (
                      <span className="text-xs text-rose-700 dark:text-rose-300 font-bold px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30">No Answer</span>
                    ) : (
                      <span className="text-sm font-bold"><ScoreBadge score={score} /> <span className="text-slate-500 text-xs font-semibold">/10</span></span>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="px-4 pb-5 space-y-4 border-t border-sky-100 dark:border-white/10 pt-4">
                    {/* Your Answer */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Your Answer
                      </p>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic min-h-[2.5rem]">
                        {qa.answer?.trim()
                          ? `"${qa.answer}"`
                          : <span className="text-slate-500 not-italic">{isSkipped ? 'Question was skipped.' : 'No answer was provided.'}</span>
                        }
                      </div>
                      {qa.code?.trim() && (
                        <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 border border-slate-700 text-xs overflow-x-auto mt-1 font-mono">{qa.code}</pre>
                      )}
                    </div>

                    {/* Score breakdown */}
                    {!isSkipped && !isEmpty && (
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { l: 'Accuracy', v: eval_.accuracy },
                          { l: 'Comm.', v: eval_.communication },
                          { l: 'Confidence', v: eval_.confidence },
                          { l: 'Depth', v: eval_.depth },
                          { l: 'Examples', v: eval_.examples },
                        ].map(d => (
                          <div key={d.l} className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                            <span className="block text-[10px] font-bold text-slate-600 dark:text-slate-400">{d.l}</span>
                            <ScoreBadge score={d.v} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Feedback */}
                    {eval_.detailedFeedback && (
                      <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 space-y-1">
                        <p className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> AI Feedback</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{eval_.detailedFeedback}</p>
                      </div>
                    )}

                    {/* Improvements */}
                    {eval_.improvements?.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 space-y-1.5">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> What to Improve</p>
                        {eval_.improvements.map((imp, i) => (
                          <p key={i} className="text-xs text-slate-700 dark:text-slate-300 font-medium">→ {imp}</p>
                        ))}
                      </div>
                    )}

                    {/* ✅ Correct / Ideal Answer */}
                    {(eval_.idealAnswer || qa.question?.idealAnswer) && (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-1.5">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Correct / Model Answer
                        </p>
                        <p className="text-xs text-slate-800 dark:text-emerald-100 leading-relaxed font-medium">
                          {eval_.idealAnswer || qa.question?.idealAnswer}
                        </p>
                      </div>
                    )}

                    {/* Expected Keywords */}
                    {qa.question?.expectedKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Key Concepts:</span>
                        {qa.question.expectedKeywords.map((k, i) => {
                          const mentioned = (qa.answer || '').toLowerCase().includes(k.toLowerCase());
                          return (
                            <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold ${mentioned ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30'}`}>
                              {mentioned ? '✓' : '✗'} {k}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-3xl p-6 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-extrabold text-slate-900 dark:text-white text-base">Practice Makes Perfect</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">Review the model answers above and practice those topics before your next interview.</p>
        </div>
        <button onClick={handleStartNew} className="px-6 py-2.5 rounded-xl glow-btn text-white font-bold text-sm shadow-xl whitespace-nowrap">
          Start Another Interview
        </button>
      </div>

      {/* Human Review / Appeal Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" /> Request Human Review / Appeal
              </h3>
              <button
                onClick={() => setShowAppealModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              If an automated evaluation was affected by audio transcription inaccuracies or you feel your technical answer was misjudged, request a formal review by an academic tutor or human evaluator.
            </p>

            {appealSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                ✓ {appealSuccess}
              </div>
            )}

            {appealError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                ⚠ {appealError}
              </div>
            )}

            <form onSubmit={handleAppealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Appeal Category
                </label>
                <select
                  value={appealCategory}
                  onChange={(e) => setAppealCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="TECHNICAL_ACCURACY">Technical Accuracy Discrepancy</option>
                  <option value="AUDIO_TRANSCRIPTION">Speech / Audio Transcription Glitch</option>
                  <option value="EVALUATION_DISCREPANCY">Model Rubric Discrepancy</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain which question or score you are appealing and provide technical context..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAppeal || appealReason.trim().length < 10}
                  className="px-5 py-2 rounded-xl glow-btn text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmittingAppeal ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
