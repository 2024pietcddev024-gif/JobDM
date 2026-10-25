import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft, Eye, EyeOff, Users, Briefcase, ShieldCheck } from 'lucide-react';

export default function UnifiedAuth({ initialMode, onNavigate }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [selectedPanel, setSelectedPanel] = useState(null); // 'student' | 'teacher' | 'hr'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const panels = [
    {
      id: 'student',
      title: 'Student Login',
      desc: 'Access interview practice, coding, and track your progress.',
      icon: UserIcon,
      color: 'indigo',
      classes: {
        bg: 'bg-indigo-600',
        hoverBg: 'hover:bg-indigo-500',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-300 dark:border-indigo-500/20',
        hoverBorder: 'hover:border-indigo-300 dark:border-indigo-500/20',
        glow: 'bg-indigo-600/10',
        cardGlow: 'shadow-[0_0_20px_rgba(79,70,229,0.3)]',
        bgSubtle: 'bg-indigo-500/5',
        hoverBgSubtle: 'hover:bg-indigo-500/10',
        iconBg: 'bg-indigo-500/20',
        iconBorder: 'border-indigo-300 dark:border-indigo-500/20'
      }
    },
    {
      id: 'teacher',
      title: 'Teacher Login',
      desc: 'Manage your batches, assigned students, and reviews.',
      icon: Users,
      color: 'emerald',
      classes: {
        bg: 'bg-emerald-600',
        hoverBg: 'hover:bg-emerald-500',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-300 dark:border-indigo-500/20',
        hoverBorder: 'hover:border-indigo-300 dark:border-indigo-500/20',
        glow: 'bg-emerald-600/10',
        cardGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        bgSubtle: 'bg-emerald-500/5',
        hoverBgSubtle: 'hover:bg-emerald-500/10',
        iconBg: 'bg-emerald-500/20',
        iconBorder: 'border-indigo-300 dark:border-indigo-500/20'
      }
    },
    {
      id: 'hr',
      title: 'HR Login',
      desc: 'Access authorized recruitment and evaluation features.',
      icon: Briefcase,
      color: 'amber',
      classes: {
        bg: 'bg-amber-600',
        hoverBg: 'hover:bg-amber-500',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-300 dark:border-indigo-500/20',
        hoverBorder: 'hover:border-indigo-300 dark:border-indigo-500/20',
        glow: 'bg-amber-600/10',
        cardGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        bgSubtle: 'bg-amber-500/5',
        hoverBgSubtle: 'hover:bg-amber-500/10',
        iconBg: 'bg-amber-500/20',
        iconBorder: 'border-indigo-300 dark:border-indigo-500/20'
      }
    },
    {
      id: 'admin',
      title: 'Super Admin',
      desc: 'Master platform management, college onboarding, and licensing.',
      icon: ShieldCheck,
      color: 'purple',
      classes: {
        bg: 'bg-purple-600',
        hoverBg: 'hover:bg-purple-500',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-300 dark:border-purple-500/20',
        hoverBorder: 'hover:border-purple-300 dark:border-purple-500/20',
        glow: 'bg-purple-600/10',
        cardGlow: 'shadow-[0_0_20px_rgba(147,51,234,0.3)]',
        bgSubtle: 'bg-purple-500/5',
        hoverBgSubtle: 'hover:bg-purple-500/10',
        iconBg: 'bg-purple-500/20',
        iconBorder: 'border-purple-300 dark:border-purple-500/20'
      }
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (selectedPanel === 'hr' && !collegeCode.trim()) {
      setError('College Code is required for HR login.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);
    
    let result;
    if (mode === 'login') {
      result = await login(email.trim(), password, selectedPanel, collegeCode.trim() || null);
    } else {
      result = await signup(name.trim(), email.trim(), password, collegeCode.trim() || null);
    }

    if (result && !result.success) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // Success routing is handled automatically by App.jsx useEffect.
      onNavigate('dashboard');
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setError('');
  };

  // 1. Role Selection Screen
  if (!selectedPanel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden animate-in fade-in">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl w-full relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mb-4">
              Select Your Portal
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Please choose your role to access the appropriate JobDM experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {panels.map((p) => {
              const Icon = p.icon;
              return (
                <div 
                  key={p.id} 
                  onClick={() => {
                    setSelectedPanel(p.id);
                    if (p.id !== 'student') setMode('login');
                  }} 
                  className={`glass-card rounded-3xl p-8 border ${p.classes.border} ${p.classes.hoverBorder} transition-all flex flex-col items-center text-center cursor-pointer group ${p.classes.bgSubtle} ${p.classes.hoverBgSubtle}`}
                >
                  <div className={`w-20 h-20 rounded-2xl ${p.classes.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-10 h-10 ${p.classes.text}`} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{p.title}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 flex-grow">
                    {p.desc}
                  </p>
                  <button className={`w-full py-3 rounded-xl ${p.classes.bg} ${p.classes.hoverBg} ${p.classes.cardGlow} text-slate-900 dark:text-white font-bold text-sm transition-all`}>
                    Continue
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <button onClick={() => onNavigate('landing')} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. The Auth Form Screen
  const config = panels.find(p => p.id === selectedPanel);
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${config.classes.glow} rounded-full blur-[100px] pointer-events-none`} />
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 ${config.classes.glow} rounded-full blur-[100px] pointer-events-none`} />

      <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-slate-300 dark:border-white/10 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8">
        
        <button onClick={() => { setSelectedPanel(null); setError(''); setEmail(''); setPassword(''); setCollegeCode(''); }} className="absolute top-6 left-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
        </button>

        <div className="text-center mt-6 mb-8">
          <div className={`w-16 h-16 rounded-2xl ${config.classes.iconBg} flex items-center justify-center mx-auto mb-4 border ${config.classes.iconBorder}`}>
            <Icon className={`w-8 h-8 ${config.classes.text}`} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-['Outfit']">
            {mode === 'login' || selectedPanel !== 'student' ? config.title : 'Create Account'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {mode === 'login' || selectedPanel !== 'student' ? `Sign in to your ${config.title.toLowerCase()}` : `Create a new account`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && selectedPanel !== 'student' ? (
            <div className="py-6 text-center text-slate-700 dark:text-slate-300 space-y-4">
              <p className="text-sm font-medium">
                {selectedPanel === 'teacher' ? 'Teacher' : selectedPanel === 'hr' ? 'HR' : 'Super Admin'} accounts are provisioned by invitation only.
              </p>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${config.classes.bg} ${config.classes.hoverBg}`}
              >
                Sign In to {config.title}
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-indigo-300 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {selectedPanel === 'hr' ? 'Email or HR ID' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={selectedPanel === 'hr' ? 'text' : 'email'}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedPanel === 'hr' ? 'HR-ORG-123456 or hr@company.com' : 'email@example.com'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              {mode === 'signup' && selectedPanel === 'student' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      College / Institute Code
                    </label>
                    <span className="text-[10px] text-slate-500">Optional</span>
                  </div>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={collegeCode}
                      onChange={(e) => setCollegeCode(e.target.value)}
                      placeholder="e.g. PIET-2026 (or sign up with your college email)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">If your college provided a code, enter it here. College domain emails (@college.edu) link automatically.</p>
                </div>
              )}

              {mode === 'login' && selectedPanel === 'hr' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    College / Company Code
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={collegeCode}
                      onChange={(e) => setCollegeCode(e.target.value)}
                      placeholder="e.g. ORG-317GGL or PIET-2026"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && selectedPanel === 'teacher' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      College Code
                    </label>
                    <span className="text-[10px] text-slate-500">Optional</span>
                  </div>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={collegeCode}
                      onChange={(e) => setCollegeCode(e.target.value)}
                      placeholder="e.g. ORG-317GGL"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 mt-4 rounded-xl text-slate-900 dark:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${config.classes.bg} ${config.classes.hoverBg} disabled:opacity-50`}
              >
                <span>{isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </>
          )}
        </form>

        {selectedPanel === 'student' && (
          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button onClick={toggleMode} className={`${config.classes.text} font-bold hover:underline`}>
                  Sign Up
                </button>
              </p>
            ) : (
              <div className="space-y-2">
                <p>
                  Already have an account?{' '}
                  <button onClick={toggleMode} className={`${config.classes.text} font-bold hover:underline`}>
                    Sign In
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
