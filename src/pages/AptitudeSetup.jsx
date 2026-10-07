import React, { useState } from 'react';
import { useAptitude } from '../context/AptitudeContext';
import { ArrowLeft, Play, LayoutGrid, Target, Brain, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Categories
      </button>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-indigo-400" />
          {selectedCategory.name}
        </h1>
        <p className="text-slate-400">Configure your practice session.</p>
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm w-fit transition-colors ml-8"
            >
              Start with {availableFallback} questions instead
            </button>
          )}
        </div>
      )}

      <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-8">
        
        {/* Question Count Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white font-medium mb-4">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <h3>Number of Questions</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[5, 10, 20, 30].map(num => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`py-3 px-4 rounded-xl font-semibold transition-all border ${
                  count === num 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5 w-full"></div>

        {/* Difficulty Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white font-medium mb-4">
            <Target className="w-5 h-5 text-indigo-400" />
            <h3>Difficulty Level</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Easy', 'Medium', 'Hard', 'Mixed'].map(level => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`py-3 px-4 rounded-xl font-semibold transition-all border ${
                  difficulty === level 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-700'
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
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
        >
          {loading ? (
            <>Starting...</>
          ) : (
            <>
              Start Practice
              <Play className="w-5 h-5" fill="currentColor" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
