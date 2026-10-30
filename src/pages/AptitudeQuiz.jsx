import React, { useState, useEffect } from 'react';
import { useAptitude } from '../context/AptitudeContext';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../services/apiClient';

export default function AptitudeQuiz({ onNavigate }) {
  const { 
    currentSessionId, questions, sessionParams, setResult, 
    setCurrentSessionId, setQuestions, setSessionParams 
  } = useAptitude();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [startTime] = useState(Date.now());

  if (!currentSessionId || !questions || questions.length === 0) {
    onNavigate('aptitude');
    return null;
  }

  const currentQuestion = questions[currentIndex];
  let options = [];
  try {
    options = typeof currentQuestion.options === 'string' 
      ? JSON.parse(currentQuestion.options) 
      : currentQuestion.options;
  } catch (e) {
    console.error("Failed to parse options", e);
  }

  const handleSelectOption = (option) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: option
    });
  };

  const handleNext = async () => {
    const targetIndex = currentIndex + 1;
    if (targetIndex < sessionParams.count) {
      if (targetIndex >= questions.length) {
        try {
          setLoading(true);
          setError(null);
          const token = localStorage.getItem('interviewiq_token');
          const res = await fetch(`${API_URL}/aptitude/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ sessionId: currentSessionId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate question');
          setQuestions([...questions, data.question]);
          setCurrentIndex(targetIndex);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentIndex(targetIndex);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const attemptSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < sessionParams.count) {
      setShowConfirm(true);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('interviewiq_token');
      
      const formattedAnswers = questions.map(q => ({
        questionId: q.id,
        userAnswer: answers[q.id] || null
      }));

      const durationMinutes = Math.round((Date.now() - startTime) / 60000);

      const res = await fetch(`${API_URL}/aptitude/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          answers: formattedAnswers,
          durationMinutes
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit session');
      }

      setResult(data);
      onNavigate('aptitude-result');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const progressPercentage = ((Object.keys(answers).length) / sessionParams.count) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-violet-50/80 dark:bg-violet-950/20 p-4 rounded-2xl border border-violet-200 dark:border-violet-800/40 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">{sessionParams?.category}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{sessionParams?.difficulty} • {sessionParams.count} Questions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Answered: {Object.keys(answers).length} / {sessionParams.count}
            </span>
            <div className="w-32 h-2.5 bg-violet-200/60 dark:bg-violet-900/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          <button 
            onClick={attemptSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Quiz
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Unanswered Questions</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">You have {sessionParams.count - Object.keys(answers).length} unanswered questions. Submit anyway?</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl font-semibold text-xs transition-colors"
            >
              Continue Quiz
            </button>
            <button 
              onClick={() => { setShowConfirm(false); handleSubmit(); }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              Submit Anyway
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-violet-50 border border-violet-200 dark:bg-violet-950/20 dark:border-violet-800/40 p-6 md:p-10 rounded-3xl relative overflow-hidden shadow-sm">
        {loading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Generating your question...</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <span className="text-xs font-bold text-violet-800 dark:text-violet-200 bg-violet-100/90 dark:bg-violet-900/50 px-3.5 py-1.5 rounded-full border border-violet-200 dark:border-violet-700/50">
            Question {currentIndex + 1} of {sessionParams.count}
          </span>
          <span className="text-xs font-medium text-slate-500">
            Topic: <span className="text-slate-800 dark:text-slate-200 font-semibold">{currentQuestion.topic}</span>
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-6 leading-relaxed relative z-10 font-['Outfit']">
          {currentQuestion.question}
        </h3>
        
        {currentQuestion.starter_code && (
          <div className="mb-6 relative z-10 rounded-2xl overflow-hidden border border-slate-300 dark:border-white/10 bg-[#1e1e1e] p-4 text-xs font-mono text-slate-200">
            <pre><code>{currentQuestion.starter_code}</code></pre>
          </div>
        )}

        <div className="space-y-3 relative z-10">
          {options && options.map((option, idx) => {
            const isSelected = answers[currentQuestion.id] === option;
            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold' 
                    : 'bg-white dark:bg-white/5 border-violet-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-violet-100/60 dark:hover:bg-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? 'bg-white text-indigo-700 shadow-sm' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                }`}>
                  {letter}
                </div>
                <span className="flex-1 text-sm">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <div className="flex gap-2 hidden md:flex">
          {Array.from({ length: sessionParams.count }).map((_, idx) => {
            const q = questions[idx];
            const isAvailable = !!q;
            const isCurrent = currentIndex === idx;
            const isAnswered = q && answers[q.id];
            return (
            <button
              key={idx}
              onClick={() => isAvailable && setCurrentIndex(idx)}
              disabled={!isAvailable}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                isCurrent 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400' 
                  : isAnswered
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300' 
                    : isAvailable 
                      ? 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-violet-50'
                      : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed border border-transparent'
              }`}
            >
              {idx + 1}
            </button>
            );
          })}
        </div>

        {currentIndex === sessionParams.count - 1 ? (
          <button
            onClick={attemptSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-emerald-500/25 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-indigo-500/25"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
}
