import React from 'react';
import { 
  CheckCircle2, AlertCircle, ArrowRight, Award, Zap, MessageSquare 
} from 'lucide-react';

export default function EvaluationModal({ evaluation, onNextQuestion, isLastQuestion }) {
  if (!evaluation) return null;

  const scoreColor = evaluation.overall >= 8.5 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
                     evaluation.overall >= 7.0 ? 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' :
                     'text-amber-400 border-amber-500/40 bg-amber-500/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl glass-card rounded-3xl p-6 lg:p-8 border border-white/10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Award className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white font-['Outfit']">AI Answer Evaluation</h3>
              <p className="text-xs text-slate-400">Multi-Dimensional Response Rating</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-2xl border ${scoreColor} text-center`}>
            <span className="block text-2xl font-black">{evaluation.overall} <span className="text-xs font-semibold text-slate-400">/ 10</span></span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{evaluation.verdict || 'Evaluated'}</span>
          </div>
        </div>

        {/* 5 Dimensions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="block text-xs font-semibold text-slate-400 mb-1">Accuracy</span>
            <span className="text-lg font-bold text-emerald-400">{evaluation.accuracy}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="block text-xs font-semibold text-slate-400 mb-1">Communication</span>
            <span className="text-lg font-bold text-indigo-400">{evaluation.communication}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="block text-xs font-semibold text-slate-400 mb-1">Confidence</span>
            <span className="text-lg font-bold text-purple-400">{evaluation.confidence}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="block text-xs font-semibold text-slate-400 mb-1">Depth</span>
            <span className="text-lg font-bold text-amber-400">{evaluation.depth}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center col-span-2 sm:col-span-1">
            <span className="block text-xs font-semibold text-slate-400 mb-1">Examples</span>
            <span className="text-lg font-bold text-rose-400">{evaluation.examples}</span>
          </div>
        </div>

        {/* Detailed Strengths & Improvements */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> Key Strengths
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {evaluation.strengths?.map((str, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <AlertCircle className="w-4 h-4" /> AI Recommendations
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {evaluation.improvements?.map((imp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Feedback Paragraph */}
        {evaluation.detailedFeedback && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <MessageSquare className="w-4 h-4" /> Feedback Summary
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {evaluation.detailedFeedback}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onNextQuestion}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl glow-btn text-white font-bold text-sm shadow-xl"
          >
            <span>{isLastQuestion ? 'View Full Report' : 'Next AI Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
