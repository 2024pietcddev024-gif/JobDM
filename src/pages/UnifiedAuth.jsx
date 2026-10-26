import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft, 
  Eye, EyeOff, Briefcase, Users, CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';

export const getRoleDashboard = (role) => {
  switch (role) {
    case 'TUTOR':
      return 'teacher-dashboard';
    case 'HR':
      return 'hr-dashboard';
    case 'SUPER_ADMIN':
      return 'registrar-overview';
    case 'COLLEGE_ADMIN':
      return 'college-admin';
    case 'STUDENT':
    default:
      return 'dashboard';
  }
};

export default function UnifiedAuth({ initialMode = 'login', onNavigate }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'login'); // 'login' | 'signup' | 'forgot'
  const [selectedRole, setSelectedRole] = useState(null); // 'student' | 'teacher' | 'hr'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode === 'signup' ? 'signup' : 'login');
    setSelectedRole(null);
    setError('');
  }, [initialMode]);

  const rolePanels = [
    {
      id: 'student',
      title: 'Student',
      desc: 'Create an account to practice interviews, coding, and aptitude.',
      buttonText: 'Continue as Student',
      icon: UserIcon,
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      btnClass: 'glow-btn text-white',
      iconBg: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'teacher',
      title: 'Teacher',
      desc: 'Manage assigned students, batches, and performance reviews.',
      buttonText: 'Continue as Teacher',
      icon: Users,
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25',
      iconBg: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'hr',
      title: 'HR',
      desc: 'Access recruitment, job management, and candidate evaluation.',
      buttonText: 'Continue as HR',
      icon: Briefcase,
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      btnClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25',
      iconBg: 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
    }
  ];

  const currentRoleConfig = rolePanels.find(r => r.id === selectedRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setResetSent(true);
        setIsLoading(false);
      }, 500);
      return;
    }

    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);
    
    let result;
    if (mode === 'login') {
      result = await login(email.trim(), password);
    } else {
      result = await signup(name.trim(), email.trim(), password, collegeCode.trim() || null, selectedRole || 'student');
    }

    if (result && !result.success) {
      setError(result.error || 'Authentication failed. Please check your credentials.');
      setIsLoading(false);
    } else {
      // Automatically determine user's role and redirect to the appropriate dashboard
      const userRole = result?.user?.campus?.role;
      const targetDashboard = getRoleDashboard(userRole);
      onNavigate(targetDashboard);
    }
  };

  // 1. SIGN-UP ROLE SELECTION SCREEN: Exactly 3 panels (Student, Teacher, HR)
  if (mode === 'signup' && !selectedRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden animate-in fade-in">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl w-full relative z-10 flex flex-col items-center">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-indigo-500/25">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mb-2">
              Create Your Account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Select your role to get started with JobDM
            </p>
          </div>

          {/* Three Responsive Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {rolePanels.map((panel) => {
              const Icon = panel.icon;
              return (
                <div 
                  key={panel.id}
                  onClick={() => { setSelectedRole(panel.id); setError(''); }}
                  className="glass-card rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:shadow-2xl cursor-pointer group"
                >
                  <div className={`w-16 h-16 rounded-2xl ${panel.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-['Outfit']">
                    {panel.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 flex-grow leading-relaxed">
                    {panel.desc}
                  </p>
                  <button 
                    type="button"
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${panel.btnClass}`}
                  >
                    <span>{panel.buttonText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => { setMode('login'); setSelectedRole(null); setError(''); }}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Already have an account? <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Sign In</span>
            </button>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 2. THE AUTH FORM SCREEN: Handles Common Login, Role-Specific Sign Up, or Password Reset
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden animate-in fade-in">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-2xl relative z-10">
        
        {/* Navigation Bar inside Form */}
        <div className="flex items-center justify-between mb-6">
          {mode === 'signup' && selectedRole ? (
            <button 
              type="button"
              onClick={() => { setSelectedRole(null); setError(''); }} 
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors text-xs font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Role Selection</span>
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => onNavigate('landing')} 
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors text-xs font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </button>
          )}

          {/* Selected Role Badge in Sign-Up Mode */}
          {mode === 'signup' && currentRoleConfig && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${currentRoleConfig.badgeClass}`}>
              Role: {currentRoleConfig.title}
            </span>
          )}
        </div>

        {/* Branding & Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-indigo-500/25">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Outfit']">
            {mode === 'signup' && currentRoleConfig
              ? `Create ${currentRoleConfig.title} Account`
              : 'Job'}
            {!(mode === 'signup' && currentRoleConfig) && <span className="gradient-text">DM</span>}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {mode === 'login' 
              ? 'Sign in to access your dashboard' 
              : mode === 'signup' && currentRoleConfig
              ? `Enter your details to register as a ${currentRoleConfig.title.toLowerCase()}`
              : 'Reset your password'}
          </p>
        </div>

        {/* Teacher / HR Institutional Authorization Notice */}
        {mode === 'signup' && (selectedRole === 'teacher' || selectedRole === 'hr') && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1 animate-in fade-in">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              Institutional Provisioning Required
            </p>
            <p className="text-[11px] leading-relaxed pl-5">
              {selectedRole === 'teacher' 
                ? 'Teacher accounts are authorized and provisioned by your college administrator.'
                : 'HR accounts are authorized and provisioned by platform administrators.'}
              {' '}If your account has already been created, please{' '}
              <button 
                type="button" 
                onClick={() => { setMode('login'); setSelectedRole(null); setError(''); }} 
                className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200"
              >
                Sign In directly
              </button>.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Forgot Password Screen */}
        {mode === 'forgot' ? (
          resetSent ? (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="font-bold text-slate-900 dark:text-white text-sm">Reset Link Sent!</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                If an account exists for <span className="font-semibold">{email}</span>, instructions to reset your password have been sent.
              </p>
              <button
                type="button"
                onClick={() => { setResetSent(false); setMode('login'); setError(''); }}
                className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 rounded-xl glow-btn text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Instructions...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Remember your password? <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Sign In</span>
                </button>
              </div>
            </form>
          )
        ) : (
          /* Login & Sign Up Forms */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Registration: Full Name */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  autoFocus={mode === 'login'}
                />
              </div>
            </div>

            {/* Registration: College Code (Optional) */}
            {mode === 'signup' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    College / Institute Code
                  </label>
                  <span className="text-[10px] text-slate-500">Optional</span>
                </div>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value)}
                    placeholder="e.g. PIET-2026"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  If your college provided a code, enter it here. College domain emails link automatically.
                </p>
              </div>
            )}

            {/* Password with Show/Hide Toggle and Forgot Link */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 mt-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                mode === 'signup' && currentRoleConfig ? currentRoleConfig.btnClass : 'glow-btn text-white shadow-indigo-600/30'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' 
                      ? 'Sign In' 
                      : currentRoleConfig 
                      ? `Create ${currentRoleConfig.title} Account`
                      : 'Create Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Mode Toggle Link */}
        {mode !== 'forgot' && (
          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => { setMode('signup'); setSelectedRole(null); setError(''); }} 
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => { setMode('login'); setSelectedRole(null); setError(''); }} 
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
