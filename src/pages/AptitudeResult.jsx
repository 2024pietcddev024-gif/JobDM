import React from 'react';
import { useAptitude } from '../context/AptitudeContext';
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, Target, Award,
  ChevronRight, Brain, AlertTriangle
} from 'lucide-react';

export default function AptitudeResult({ onNavigate }) {
  const { result, questions, sessionParams, setCurrentSessionId, setQuestions, setResult, setSessionParams } = useAptitude();

  if (!result || !questions) {
    onNavigate('aptitude');
    return null;
  }

  const handleFinish = () => {
    setCurrentSessionId(null);
    setQuestions([]);
    setResult(null);
    setSessionParams(null);
    onNavigate('aptitude');
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-indigo-600 dark:text-indigo-400';
    if (accuracy >= 50) return 'text-indigo-600 dark:text-indigo-400';
    return 'text-red-400';
  };

  const getAccuracyGradient = (accuracy) => {
    if (accuracy >= 80) return 'from-emerald-500/20 to-emerald-900/20 border-indigo-300 dark:border-indigo-500/20';
    if (accuracy >= 50) return 'from-amber-500/20 to-amber-900/20 border-indigo-300 dark:border-indigo-500/20';
    return 'from-red-500/20 to-red-900/20 border-red-500/30';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <Award className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Practice Results
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {sessionParams?.category} • {sessionParams?.difficulty}
          </p>
        </div>
        <button
          onClick={handleFinish}
          className="px-6 py-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white rounded-lg font-medium transition-colors border border-slate-300 dark:border-white/10"
        >
          Finish Review
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="text-slate-500">Total Questions:</span> 
          <span className="font-bold text-slate-900 dark:text-white">{result.total}</span>
        </div>
        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="text-slate-500">Answered:</span> 
          <span className="font-bold text-slate-900 dark:text-white">{result.answered}</span>
        </div>
        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="text-slate-500">Unanswered:</span> 
          <span className="font-bold text-slate-900 dark:text-white">{result.skipped}</span>
        </div>
        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-slate-500">Time Taken:</span> 
          <span className="font-bold text-slate-900 dark:text-white">{result.durationMinutes || '< 1'} min</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="p-3 rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 mb-3 shadow-sm">
            <Target className="w-7 h-7" />
          </div>
          <div className="text-3xl font-extrabold text-violet-700 dark:text-violet-300 mb-1 font-['Outfit']">
            {Math.round(result.score)}%
          </div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Accuracy</div>
        </div>
        
        <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 mb-3 shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 mb-1 font-['Outfit']">{result.correct}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Correct</div>
        </div>

        <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="p-3 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 mb-3 shadow-sm">
            <XCircle className="w-7 h-7" />
          </div>
          <div className="text-3xl font-extrabold text-rose-700 dark:text-rose-300 mb-1 font-['Outfit']">{result.incorrect}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Incorrect</div>
        </div>

        <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 mb-3 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 mb-1 font-['Outfit']">{result.skipped}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Skipped</div>
        </div>
      </div>

      {/* Questions Review */}
      <div className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 font-['Outfit']">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            <Brain className="w-6 h-6" />
          </div>
          Detailed Question Breakdown
        </h2>
        
        {questions.map((q, idx) => {
          const resObj = result.results.find(r => r.questionId === q.id) || {};
          const isCorrect = resObj.isCorrect;
          const isSkipped = resObj.userAnswer == null;
          
          let options = [];
          try {
            options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          } catch(e) {}

          return (
            <div key={q.id} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
              
              {/* Question Header */}
              <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${
                isSkipped 
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200' 
                  : isCorrect 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isSkipped 
                      ? 'bg-amber-200 text-amber-900' 
                      : isCorrect 
                        ? 'bg-emerald-200 text-emerald-900' 
                        : 'bg-rose-200 text-rose-900'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="font-bold text-sm">
                    {isSkipped ? 'Skipped' : isCorrect ? 'Correct Answer' : 'Incorrect Answer'}
                  </span>
                </div>
                <div className="text-xs font-semibold opacity-80">
                  Topic: {q.topic}
                </div>
              </div>

              {/* Question Body */}
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">{q.question}</h3>
                
                <div className="space-y-3 mb-6">
                  {options.map((opt, oIdx) => {
                    const isUserAns = opt === resObj.userAnswer;
                    const isActualCorrect = opt === resObj.correctAnswer;
                    
                    let bgClass = "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300";
                    if (isActualCorrect) {
                      bgClass = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold shadow-sm";
                    } else if (isUserAns && !isCorrect) {
                      bgClass = "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold";
                    }

                    return (
                      <div key={oIdx} className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${bgClass}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isActualCorrect ? 'bg-emerald-600 text-white shadow-sm' : 
                          (isUserAns && !isCorrect) ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <span className="flex-1 text-sm">{opt}</span>
                        {isActualCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        {isUserAns && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {resObj.explanation && (
                  <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 mt-6 shadow-sm">
                    <h4 className="text-violet-800 dark:text-violet-300 font-bold text-xs uppercase tracking-wider mb-1.5 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-600" /> Explanation
                    </h4>
                    <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{resObj.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
