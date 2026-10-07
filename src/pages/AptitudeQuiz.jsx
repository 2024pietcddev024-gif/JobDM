import React, { useState, useEffect } from 'react';
import { useAptitude } from '../context/AptitudeContext';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-white/5 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white">{sessionParams?.category}</h2>
          <p className="text-sm text-slate-400">{sessionParams?.difficulty} • {sessionParams.count} Questions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-slate-400 mb-1">
              Answered: {Object.keys(answers).length} / {sessionParams.count}
            </span>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          <button 
            onClick={attemptSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl font-semibold transition-colors border border-emerald-500/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Unanswered Questions</p>
              <p className="text-sm">You have {sessionParams.count - Object.keys(answers).length} unanswered questions. Submit anyway?</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Continue Quiz
            </button>
            <button 
              onClick={() => { setShowConfirm(false); handleSubmit(); }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-sm transition-colors"
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
      <div className="glass-card p-6 md:p-10 rounded-3xl border border-white/5 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center gap-3 bg-slate-800 p-4 rounded-xl border border-white/10 shadow-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="font-medium text-white">Generating your question...</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Question {currentIndex + 1} of {sessionParams.count}
          </span>
          <span className="text-sm font-medium text-slate-500">
            Topic: <span className="text-slate-300">{currentQuestion.topic}</span>
          </span>
        </div>

        <h3 className="text-xl md:text-2xl font-medium text-white mb-8 leading-relaxed relative z-10">
          {currentQuestion.question}
        </h3>
        
        {currentQuestion.starter_code && (
          <div className="mb-8 relative z-10 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e1e] p-4 text-sm font-mono text-slate-300">
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
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-inner' 
                    : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {letter}
                </div>
                <span className="flex-1 text-base">{option}</span>
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
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        
        <div className="flex gap-2 hidden md:flex">
          {Array.from({ length: sessionParams.count }).map((_, idx) => {
            const q = questions[idx];
            const isAvailable = !!q;
            return (
            <button
              key={idx}
              onClick={() => isAvailable && setCurrentIndex(idx)}
              disabled={!isAvailable}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors flex items-center justify-center ${
                currentIndex === idx 
                  ? 'bg-white text-slate-900' 
                  : (q && answers[q.id])
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : isAvailable 
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-slate-800/30 text-slate-600 cursor-not-allowed border border-white/5'
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
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Submit
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

    </div>
  );
}
