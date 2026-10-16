import React from 'react';
import { 
  Play, 
  BrainCircuit, 
  Code2, 
  LineChart, 
  Briefcase,
  GraduationCap,
  Users,
  Building2,
  CheckCircle2,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage({ onNavigate }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="w-full min-h-screen relative overflow-x-hidden text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Navbar */}
      <nav className="w-full px-6 md:px-12 py-4 flex items-center justify-between z-50 relative border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-lg shadow-brand-500/20 text-lg">
            J
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">JobDM</span>
        </div>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-700 dark:text-slate-300">
          <a href="#" className="hover:text-slate-900 dark:text-white transition-colors">Home</a>
          <a href="#" className="hover:text-slate-900 dark:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-slate-900 dark:text-white transition-colors">How It Works</a>
          <a href="#" className="hover:text-slate-900 dark:text-white transition-colors">For Students</a>
          <a href="#" className="hover:text-slate-900 dark:text-white transition-colors">For Educators</a>
          <a href="#" className="hover:text-slate-900 dark:text-white transition-colors">About</a>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-white/5 rounded-full transition-colors hidden sm:block"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            onClick={() => onNavigate('auth-login')}
            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white px-4 py-2 transition-colors"
          >
            Login
          </button>
          <button 
            onClick={() => onNavigate('auth-signup')}
            className="text-sm font-medium glow-btn text-white px-6 py-2.5 rounded-full"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative w-full max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-32 flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left: Text Content */}
        <div className="flex-1 z-10 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-indigo-300 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            JobDM Platform 2.0 Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.15]">
            Practice, <br />
            <span className="gradient-text pb-2">Prepare,</span> <br />
            Get Hired.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl leading-relaxed">
            The ultimate AI career platform for mastering technical interviews, improving coding skills, and securing your dream role.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-4">
            <button 
              onClick={() => onNavigate('auth-signup')}
              className="w-full sm:w-auto glow-btn text-white px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 text-lg shadow-xl shadow-brand-500/25 hover:-translate-y-0.5 transition-transform"
            >
              Get Started <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => {}}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 text-lg shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Play size={20} className="text-brand-500 dark:text-brand-400" /> Watch Demo
            </button>
          </div>
        </div>

        {/* Right: Laptop Dashboard Graphic */}
        <div className="flex-1 w-full relative z-10 mt-12 lg:mt-0">
          
          {/* Decorative ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-400/20 dark:bg-brand-500/20 blur-[100px] rounded-full pointer-events-none"></div>

          {/* Floating Cards */}
          <div className="absolute -left-12 top-10 glass-card p-3 rounded-xl flex items-center gap-3 animate-float z-20 hidden md:flex border border-slate-300 dark:border-white/10 shadow-xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BrainCircuit size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">AI Mock Interviews</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Real-time feedback</p>
            </div>
          </div>

          <div className="absolute -right-8 top-32 glass-card p-3 rounded-xl flex items-center gap-3 animate-float z-20 hidden md:flex border border-slate-300 dark:border-white/10 shadow-xl backdrop-blur-md" style={{ animationDelay: '1s' }}>
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Code2 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Coding Practice</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">500+ Challenges</p>
            </div>
          </div>

          <div className="absolute -left-4 bottom-24 glass-card p-3 rounded-xl flex items-center gap-3 animate-float z-20 hidden md:flex border border-slate-300 dark:border-white/10 shadow-xl backdrop-blur-md" style={{ animationDelay: '2s' }}>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <LineChart size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Aptitude Tests</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Track progress</p>
            </div>
          </div>

          <div className="absolute -right-4 bottom-10 glass-card p-3 rounded-xl flex items-center gap-3 animate-float z-20 hidden md:flex border border-slate-300 dark:border-white/10 shadow-xl backdrop-blur-md" style={{ animationDelay: '3s' }}>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Get Hired</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Top companies</p>
            </div>
          </div>

          {/* Laptop Frame */}
          <div className="relative mx-auto w-full max-w-[600px] aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-t-3xl rounded-b-sm border-[8px] border-slate-300 dark:border-slate-900 shadow-2xl shadow-slate-300/50 dark:shadow-brand-500/20 overflow-hidden z-10 flex flex-col">
            {/* Fake Browser Top */}
            <div className="h-5 w-full bg-slate-200 dark:bg-slate-900 flex items-center px-3 gap-1.5 shrink-0 border-b border-slate-300 dark:border-transparent">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500/80"></div>
            </div>
            {/* Screen Content */}
            <div className="flex-1 bg-white dark:bg-[#0a0f1c] relative p-4 flex flex-col gap-4 overflow-hidden">
               {/* Dashboard Header */}
               <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded bg-brand-500 text-[10px] font-bold flex items-center justify-center text-slate-900 dark:text-white">J</div>
                   <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Student Dashboard</span>
                 </div>
                 <div className="flex gap-2 items-center">
                   <div className="w-16 h-3 bg-slate-100 dark:bg-white/10 rounded-full"></div>
                   <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-brand-500"></div>
                 </div>
               </div>
               
               {/* Dashboard Content */}
               <div className="flex gap-4 h-full">
                  {/* Sidebar */}
                  <div className="w-1/4 h-full flex flex-col gap-2">
                    <div className="h-6 w-full bg-brand-50 dark:bg-brand-500/20 rounded border border-brand-100 dark:border-brand-500/30"></div>
                    <div className="h-6 w-full bg-slate-50 dark:bg-white/5 rounded border border-slate-100 dark:border-transparent"></div>
                    <div className="h-6 w-full bg-slate-50 dark:bg-white/5 rounded border border-slate-100 dark:border-transparent"></div>
                    <div className="h-6 w-full bg-slate-50 dark:bg-white/5 rounded border border-slate-100 dark:border-transparent"></div>
                  </div>
                  {/* Main */}
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Stats */}
                    <div className="flex gap-2">
                      <div className="flex-1 h-14 bg-violet-50 dark:bg-violet-950/40 rounded-lg border border-violet-200 dark:border-violet-800/40 p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-violet-600 dark:text-violet-300 font-semibold">Interviews</span>
                        <span className="text-sm font-bold text-violet-900 dark:text-white">12</span>
                      </div>
                      <div className="flex-1 h-14 bg-cyan-50 dark:bg-cyan-950/40 rounded-lg border border-cyan-200 dark:border-cyan-800/40 p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-cyan-600 dark:text-cyan-300 font-semibold">Score</span>
                        <span className="text-sm font-bold text-cyan-900 dark:text-white">85%</span>
                      </div>
                      <div className="flex-1 h-14 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/40 p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-blue-600 dark:text-blue-300 font-semibold">Rank</span>
                        <span className="text-sm font-bold text-blue-900 dark:text-white">#42</span>
                      </div>
                    </div>
                    {/* Graph Area */}
                    <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5 p-3 flex flex-col gap-2">
                       <span className="text-[10px] text-slate-500 dark:text-slate-400">Performance Trend</span>
                       <div className="flex-1 w-full flex items-end gap-1.5 px-2 pt-2">
                          {[40, 55, 45, 70, 65, 80, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-brand-500 to-brand-300 dark:from-brand-600 dark:to-brand-400 rounded-t-sm opacity-90 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
          {/* Laptop Base */}
          <div className="mx-auto w-[115%] max-w-[690px] h-3.5 bg-slate-200 dark:bg-slate-700 rounded-b-2xl border-t border-slate-300 dark:border-slate-600 shadow-2xl z-0 relative left-1/2 -translate-x-1/2 flex justify-center">
            <div className="w-1/4 h-1 bg-slate-300 dark:bg-slate-400 rounded-b-md"></div>
          </div>
        </div>
      </main>

      {/* Feature Summaries Below Hero */}
      <section className="relative w-full max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="glass-card p-8 rounded-2xl glass-card-hover group border border-slate-300 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">For Students</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Access AI mock interviews, practice coding challenges, and build a resume that stands out to top employers.
            </p>
            <ul className="space-y-3 mb-2">
              <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} className="text-brand-500"/> Real-time feedback</li>
              <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} className="text-brand-500"/> Skill tracking</li>
            </ul>
          </div>

          <div className="glass-card p-8 rounded-2xl glass-card-hover group border border-slate-300 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">For Educators</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Monitor student progress, assign custom assessments, and identify areas for improvement across your cohorts.
            </p>
            <ul className="space-y-3 mb-2">
              <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} className="text-brand-500"/> Batch analytics</li>
              <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} className="text-brand-500"/> Custom assignments</li>
            </ul>
          </div>

          <div className="glass-card p-8 rounded-2xl glass-card-hover group border border-slate-300 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Building2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">For Colleges</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Boost placement rates, connect with industry partners, and manage campus recruitment drives effortlessly.
            </p>
            <ul className="space-y-3 mb-2">
              <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} className="text-brand-500"/> Placement tracking</li>
              <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={16} className="text-brand-500"/> Corporate connect</li>
            </ul>
          </div>

        </div>
      </section>

      {/* Bottom Feature Strip */}
      <section className="w-full bg-brand-50 dark:bg-brand-900/20 border-t border-slate-200 dark:border-white/5 py-12 mt-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-wrap justify-between items-center gap-8">
          <div className="flex items-center gap-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><BrainCircuit size={20} /></div> 
            AI-Powered
          </div>
          <div className="flex items-center gap-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Code2 size={20} /></div> 
            500+ Challenges
          </div>
          <div className="flex items-center gap-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Users size={20} /></div> 
            10k+ Students
          </div>
          <div className="flex items-center gap-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Building2 size={20} /></div> 
            50+ Partners
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="w-full py-8 text-center text-sm text-slate-500 border-t border-slate-200 dark:border-white/5">
        <p>&copy; {new Date().getFullYear()} JobDM. All rights reserved.</p>
      </footer>
    </div>
  );
}
