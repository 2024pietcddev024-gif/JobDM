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
    if (accuracy >= 80) return 'text-emerald-400';
    if (accuracy >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getAccuracyGradient = (accuracy) => {
    if (accuracy >= 80) return 'from-emerald-500/20 to-emerald-900/20 border-emerald-500/30';
    if (accuracy >= 50) return 'from-amber-500/20 to-amber-900/20 border-amber-500/30';
    return 'from-red-500/20 to-red-900/20 border-red-500/30';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Award className="w-8 h-8 text-indigo-400" />
            Practice Results
          </h1>
          <p className="text-slate-400">
            {sessionParams?.category} • {sessionParams?.difficulty}
          </p>
        </div>
        <button
          onClick={handleFinish}
          className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors border border-white/10"
        >
          Finish Review
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-white/5">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-500">Total Questions:</span> 
          <span className="font-bold">{result.total}</span>
        </div>
        <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-500">Answered:</span> 
          <span className="font-bold">{result.answered}</span>
        </div>
        <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-500">Unanswered:</span> 
          <span className="font-bold">{result.skipped}</span>
        </div>
        <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-slate-500">Time Taken:</span> 
          <span className="font-bold">{result.durationMinutes || '< 1'} min</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-6 rounded-2xl border bg-gradient-to-br ${getAccuracyGradient(result.score)} flex flex-col items-center justify-center text-center`}>
          <Target className={`w-8 h-8 mb-3 ${getAccuracyColor(result.score)}`} />
          <div className={`text-4xl font-bold mb-1 ${getAccuracyColor(result.score)}`}>
            {Math.round(result.score)}%
          </div>
          <div className="text-sm font-medium text-slate-300">Accuracy</div>
        </div>
        
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-800/40 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-400" />
          <div className="text-3xl font-bold text-white mb-1">{result.correct}</div>
          <div className="text-sm font-medium text-slate-400">Correct</div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-slate-800/40 flex flex-col items-center justify-center text-center">
          <XCircle className="w-8 h-8 mb-3 text-red-400" />
          <div className="text-3xl font-bold text-white mb-1">{result.incorrect}</div>
          <div className="text-sm font-medium text-slate-400">Incorrect</div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-slate-800/40 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-8 h-8 mb-3 text-amber-400" />
          <div className="text-3xl font-bold text-white mb-1">{result.skipped}</div>
          <div className="text-sm font-medium text-slate-400">Skipped</div>
        </div>
      </div>

      {/* Questions Review */}
      <div className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-400" />
          Detailed Review
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
            <div key={q.id} className="glass-card rounded-2xl overflow-hidden border border-white/5">
              
              {/* Question Header */}
              <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSkipped 
                  ? 'bg-amber-500/10 border-b border-amber-500/20' 
                  : isCorrect 
                    ? 'bg-emerald-500/10 border-b border-emerald-500/20' 
                    : 'bg-red-500/10 border-b border-red-500/20'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    isSkipped 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : isCorrect 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-white">
                    {isSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-400">
                  Topic: {q.topic}
                </div>
              </div>

              {/* Question Body */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-white mb-6">{q.question}</h3>
                
                <div className="space-y-3 mb-6">
                  {options.map((opt, oIdx) => {
                    const isUserAns = opt === resObj.userAnswer;
                    const isActualCorrect = opt === resObj.correctAnswer;
                    
                    let bgClass = "bg-slate-800/40 border-white/5 text-slate-300";
                    if (isActualCorrect) {
                      bgClass = "bg-emerald-500/20 border-emerald-500/50 text-white shadow-inner";
                    } else if (isUserAns && !isCorrect) {
                      bgClass = "bg-red-500/20 border-red-500/50 text-white";
                    }

                    return (
                      <div key={oIdx} className={`p-4 rounded-xl border flex items-center gap-3 ${bgClass}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isActualCorrect ? 'bg-emerald-500 text-white' : 
                          (isUserAns && !isCorrect) ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <span className="flex-1">{opt}</span>
                        {isActualCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {isUserAns && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {resObj.explanation && (
                  <div className="p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/20 mt-6">
                    <h4 className="text-indigo-300 font-bold text-sm uppercase tracking-wider mb-2">Explanation</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{resObj.explanation}</p>
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
