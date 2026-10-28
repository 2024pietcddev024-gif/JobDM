import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Flame, User, LogOut, ChevronDown, Menu, X, PlusCircle, Moon, Sun, Building2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onNavigate, currentPage, toggleSidebar, isSidebarOpen }) {
  const { user, isAuthenticated, setIsAuthModalOpen, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const initials = (user?.name || user?.full_name || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-300 dark:border-white/10 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-xl px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-['Outfit']">
              Job<span className="gradient-text">DM</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {(!user?.campus?.role || user?.campus?.role === 'STUDENT') && (
          <>
            <button onClick={() => onNavigate('new-interview')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl glow-btn text-white font-semibold text-sm transition-all">
              <PlusCircle className="w-4 h-4" />
              <span>New Interview</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-300 font-bold text-xs shadow-sm">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-500 animate-pulse" />
              <span>{user?.streakDays || user?.streak_days || 0} Day Streak</span>
            </div>
          </>
        )}

        {user?.campus?.role === 'SUPER_ADMIN' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Master Super Admin</span>
          </div>
        )}

        {user?.campus?.role === 'COLLEGE_ADMIN' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-sm">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>College Admin</span>
          </div>
        )}

        {user?.campus?.role === 'HR' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-sm">
            <span>Corporate Recruiter</span>
          </div>
        )}

        {user?.campus?.role === 'TUTOR' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs shadow-sm">
            <span>Faculty Portal</span>
          </div>
        )}

        <button 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-white/5 rounded-full transition-colors hidden sm:block"
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {isAuthenticated ? (
          <div className="relative">
            <button onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white dark:bg-white/5 transition-colors border border-transparent hover:border-slate-300 dark:border-white/10">
              <div className="w-8 h-8 rounded-lg ring-2 ring-indigo-500/40 bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-300 dark:border-indigo-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{initials}</span>
              </div>
              <span className="hidden md:inline font-medium text-sm text-slate-800 dark:text-slate-200">{user?.name || user?.full_name || 'Account'}</span>
              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 glass-card rounded-2xl p-2 shadow-2xl z-50 border border-slate-300 dark:border-white/10 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-300 dark:border-white/10">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name || user?.full_name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{user?.email}</p>
                </div>
                <button onClick={() => { 
                  onNavigate(
                    user?.campus?.role === 'TUTOR' ? 'teacher-profile' : 
                    user?.campus?.role === 'COLLEGE_ADMIN' ? 'college-admin-college' : 
                    'profile'
                  ); 
                  setShowUserDropdown(false); 
                }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-white/10 hover:text-slate-900 dark:text-white transition-colors">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>My Profile</span>
                </button>
                <div className="my-1 border-t border-slate-300 dark:border-white/10"></div>
                <button onClick={() => { logout(); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-rose-500/10 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => onNavigate('auth-login')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-sm">
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
