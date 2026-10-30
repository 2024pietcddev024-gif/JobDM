import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAptitude } from '../context/AptitudeContext';
import { 
  Brain, Calculator, BookOpen, Code, Network, Cpu, Globe, Database, 
  Wifi, Binary, Layers, Terminal, ChevronRight, Loader2, AlertCircle, TrendingUp
} from 'lucide-react';
import { API_URL } from '../services/apiClient';

const ICONS = {
  Brain, Calculator, BookOpen, Code, Network, Cpu, Globe, Database, Wifi, Binary, Layers, Terminal
};

const CATEGORY_THEMES = [
  {
    bg: 'bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-950/20',
    border: 'border-amber-200 hover:border-amber-300 dark:border-amber-800/40',
    borderTop: 'border-t-4 border-t-amber-400 dark:border-t-amber-500',
    iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    badge: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    accent: 'text-amber-700 dark:text-amber-300',
    blob: 'from-amber-400/20 to-orange-400/20'
  },
  {
    bg: 'bg-violet-50 hover:bg-violet-100/70 dark:bg-violet-950/20',
    border: 'border-violet-200 hover:border-violet-300 dark:border-violet-800/40',
    borderTop: 'border-t-4 border-t-violet-400 dark:border-t-violet-500',
    iconBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    badge: 'bg-violet-100/80 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
    accent: 'text-violet-700 dark:text-violet-300',
    blob: 'from-violet-400/20 to-indigo-400/20'
  },
  {
    bg: 'bg-blue-50 hover:bg-blue-100/70 dark:bg-blue-950/20',
    border: 'border-blue-200 hover:border-blue-300 dark:border-blue-800/40',
    borderTop: 'border-t-4 border-t-blue-400 dark:border-t-blue-500',
    iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    badge: 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    accent: 'text-blue-700 dark:text-blue-300',
    blob: 'from-blue-400/20 to-sky-400/20'
  },
  {
    bg: 'bg-emerald-50 hover:bg-emerald-100/70 dark:bg-emerald-950/20',
    border: 'border-emerald-200 hover:border-emerald-300 dark:border-emerald-800/40',
    borderTop: 'border-t-4 border-t-emerald-400 dark:border-t-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    badge: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    accent: 'text-emerald-700 dark:text-emerald-300',
    blob: 'from-emerald-400/20 to-teal-400/20'
  },
  {
    bg: 'bg-cyan-50 hover:bg-cyan-100/70 dark:bg-cyan-950/20',
    border: 'border-cyan-200 hover:border-cyan-300 dark:border-cyan-800/40',
    borderTop: 'border-t-4 border-t-cyan-400 dark:border-t-cyan-500',
    iconBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    badge: 'bg-cyan-100/80 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
    accent: 'text-cyan-700 dark:text-cyan-300',
    blob: 'from-cyan-400/20 to-teal-400/20'
  },
  {
    bg: 'bg-pink-50 hover:bg-pink-100/70 dark:bg-pink-950/20',
    border: 'border-pink-200 hover:border-pink-300 dark:border-pink-800/40',
    borderTop: 'border-t-4 border-t-pink-400 dark:border-t-pink-500',
    iconBg: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
    badge: 'bg-pink-100/80 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    accent: 'text-pink-700 dark:text-pink-300',
    blob: 'from-pink-400/20 to-rose-400/20'
  }
];

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
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Unable to load aptitude categories</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:bg-white/20 transition-colors">
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-3 font-['Outfit']">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shadow-sm">
              <Brain className="w-6 h-6" />
            </div>
            Aptitude Practice
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base">
            Prepare for placements, competitive exams, interviews, and technical assessments with timed quizzes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((category, index) => {
          const Icon = ICONS[category.icon] || Brain;
          const theme = CATEGORY_THEMES[index % CATEGORY_THEMES.length];
          
          return (
            <button
              key={category.id}
              onClick={() => handleSelectCategory(category)}
              className={`text-left p-6 rounded-2xl transition-all group flex flex-col h-full border ${theme.borderTop} ${theme.border} ${theme.bg} relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.blob} rounded-full blur-2xl -mr-16 -mt-16 transition-transform group-hover:scale-150`}></div>
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${theme.iconBg} transition-colors shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                {category.questionCount > 0 && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${theme.badge}`}>
                    {category.questionCount} Questions
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 relative z-10 font-['Outfit']">{category.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1 relative z-10 leading-relaxed">
                {category.description}
              </p>
              
              {category.progress && category.progress.sessions > 0 ? (
                <div className="mt-auto pt-4 border-t border-slate-200/60 dark:border-white/5 relative z-10 flex justify-between items-center text-sm">
                  <div className={`flex items-center gap-2 font-semibold ${theme.accent}`}>
                    <TrendingUp className="w-4 h-4" />
                    <span>{category.progress.accuracy}% Accuracy</span>
                  </div>
                  <div className="text-slate-500 text-xs">
                    {category.progress.attempted} attempted
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-4 border-t border-slate-200/60 dark:border-white/5 relative z-10 flex justify-between items-center">
                  <span className={`text-sm font-bold ${theme.accent} transition-colors`}>
                    Start Practice
                  </span>
                  <ChevronRight className={`w-4 h-4 ${theme.accent} transition-transform group-hover:translate-x-1`} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
