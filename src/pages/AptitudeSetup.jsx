import React, { useState } from 'react';
import { useAptitude } from '../context/AptitudeContext';
import { ArrowLeft, Play, LayoutGrid, Target, Brain, AlertCircle } from 'lucide-react';
import { API_URL } from '../services/apiClient';

export default function AptitudeSetup({ onNavigate }) {
  const { selectedCategory, setSessionParams, setCurrentSessionId, setQuestions } = useAptitude();
  
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableFallback, setAvailableFallback] = useState(null);

  if (!selectedCategory) {
    onNavigate('aptitude');
    return null;
  }

  const getErrorMessage = (error) => {
    if (!error) return 'Something went wrong.';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.error) return error.error;
    if (error?.message) return error.message;
    return 'Unable to start practice session.';
  };

  const handleStart = async (overrideCount = null) => {
    const finalCount = typeof overrideCount === 'number' ? overrideCount : count;
    try {
      setLoading(true);
      setError(null);
      setAvailableFallback(null);
      
      const token = localStorage.getItem('interviewiq_token');
      if (!token) {
        setError('Please log in to start practicing.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/aptitude/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: selectedCategory.name,
          difficulty: difficulty,
          count: finalCount
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.available !== undefined && data.available > 0) {
          setAvailableFallback(data.available);
        }
        throw new Error(data.error || 'Failed to start session');
      }

      setSessionParams({ category: selectedCategory.name, difficulty, count: finalCount });
      setCurrentSessionId(data.sessionId);
      setQuestions(data.questions);
      
      onNavigate('aptitude-quiz');
    } catch (err) {
      console.error('Aptitude Setup Error:', err);
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <button 
        onClick={() => onNavigate('aptitude')}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Categories
      </button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          {selectedCategory.name}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">Configure your practice session.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-3">
          <div className="flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
          {availableFallback && (
            <button 
              onClick={() => handleStart(availableFallback)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-lg font-medium text-sm w-fit transition-colors ml-8"
            >
              Start with {availableFallback} questions instead
            </button>
          )}
        </div>
      )}

      <div className="bg-cyan-50 border border-cyan-200 dark:bg-cyan-950/20 dark:border-cyan-800/40 p-6 lg:p-8 rounded-3xl space-y-8 shadow-sm">
        
        {/* Question Count Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold font-['Outfit'] mb-4">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className="text-base">Number of Questions</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[5, 10, 20, 30].map(num => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`py-3.5 px-4 rounded-2xl font-bold text-sm transition-all border ${
                  count === num 
                    ? 'bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-500/25' 
                    : 'bg-white dark:bg-white/5 border-cyan-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-cyan-100/60 dark:hover:bg-white/10'
                }`}
              >
                {num} Questions
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-cyan-200/60 dark:bg-white/10 w-full"></div>

        {/* Difficulty Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold font-['Outfit'] mb-4">
            <div className="p-2 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base">Difficulty Level</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { level: 'Easy', active: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/25', inactive: 'bg-white dark:bg-white/5 border-emerald-200/80 dark:border-white/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60' },
              { level: 'Medium', active: 'bg-amber-600 border-amber-600 text-white shadow-amber-500/25', inactive: 'bg-white dark:bg-white/5 border-amber-200/80 dark:border-white/10 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60' },
              { level: 'Hard', active: 'bg-rose-600 border-rose-600 text-white shadow-rose-500/25', inactive: 'bg-white dark:bg-white/5 border-rose-200/80 dark:border-white/10 text-rose-800 dark:text-rose-300 hover:bg-rose-100/60' },
              { level: 'Mixed', active: 'bg-violet-600 border-violet-600 text-white shadow-violet-500/25', inactive: 'bg-white dark:bg-white/5 border-violet-200/80 dark:border-white/10 text-violet-800 dark:text-violet-300 hover:bg-violet-100/60' }
            ].map(({ level, active, inactive }) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`py-3.5 px-4 rounded-2xl font-bold text-sm transition-all border shadow-sm ${
                  difficulty === level 
                    ? `${active} shadow-md` 
                    : inactive
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleStart()}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
        >
          {loading ? (
            <>Starting...</>
          ) : (
            <>
              Start Practice Session
              <Play className="w-5 h-5" fill="currentColor" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
