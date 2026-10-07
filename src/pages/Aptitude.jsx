import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAptitude } from '../context/AptitudeContext';
import { 
  Brain, Calculator, BookOpen, Code, Network, Cpu, Globe, Database, 
  Wifi, Binary, Layers, Terminal, ChevronRight, Loader2, AlertCircle, TrendingUp
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ICONS = {
  Brain, Calculator, BookOpen, Code, Network, Cpu, Globe, Database, Wifi, Binary, Layers, Terminal
};

export default function Aptitude({ onNavigate }) {
  const { user } = useAuth();
  const { setSelectedCategory } = useAptitude();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('interviewiq_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const res = await fetch(`${API_URL}/aptitude/categories`, { headers });
        if (!res.ok) throw new Error('Failed to fetch categories');
        
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    onNavigate('aptitude-setup');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Unable to load aptitude categories</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Brain className="w-6 h-6" />
            </div>
            Aptitude Practice
          </h1>
          <p className="text-slate-400 text-lg">
            Prepare for placements, interviews, competitive exams, and technical assessments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = ICONS[category.icon] || Brain;
          
          return (
            <button
              key={category.id}
              onClick={() => handleSelectCategory(category)}
              className="text-left glass-card p-6 rounded-2xl hover:bg-white/5 transition-all group flex flex-col h-full border border-white/5 hover:border-indigo-500/50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 rounded-xl bg-slate-800/80 text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/20 transition-colors shadow-inner shadow-black/50">
                  <Icon className="w-6 h-6" />
                </div>
                {category.questionCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 bg-white/5 text-slate-400 rounded-full">
                    {category.questionCount} Questions
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 relative z-10">{category.name}</h3>
              <p className="text-sm text-slate-400 mb-6 flex-1 relative z-10 leading-relaxed">
                {category.description}
              </p>
              
              {category.progress && category.progress.sessions > 0 ? (
                <div className="mt-auto pt-4 border-t border-white/5 relative z-10 flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-semibold">{category.progress.accuracy}% Accuracy</span>
                  </div>
                  <div className="text-slate-500 text-xs">
                    {category.progress.attempted} attempted
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-4 border-t border-white/5 relative z-10 flex justify-between items-center">
                  <span className="text-sm font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Start Practice
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
