import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Flame, User, LogOut, ChevronDown, Menu, X, PlusCircle } from 'lucide-react';

export default function Navbar({ onNavigate, currentPage, toggleSidebar, isSidebarOpen }) {
  const { user, isAuthenticated, setIsAuthModalOpen, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const initials = (user?.name || user?.full_name || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090d16]/80 backdrop-blur-xl px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div onClick={() => onNavigate('dashboard')} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white font-['Outfit']">
              Interview<span className="gradient-text">IQ</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI MOCK</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('new-interview')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl glow-btn text-white font-semibold text-sm transition-all">
          <PlusCircle className="w-4 h-4" />
          <span>New Interview</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-xs">
          <Flame className="w-4 h-4 fill-amber-400 text-amber-500 animate-pulse" />
          <span>{user?.streakDays || user?.streak_days || 0} Day Streak</span>
        </div>

        {isAuthenticated ? (
          <div className="relative">
            <button onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
              <div className="w-8 h-8 rounded-lg ring-2 ring-indigo-500/40 bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <span className="hidden md:inline font-medium text-sm text-slate-200">{user?.name || user?.full_name || 'Account'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 glass-card rounded-2xl p-2 shadow-2xl z-50 border border-white/10 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-sm font-semibold text-white">{user?.name || user?.full_name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
                <button onClick={() => { onNavigate('profile'); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>My Profile</span>
                </button>
                <div className="my-1 border-t border-white/10"></div>
                <button onClick={() => { logout(); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors">
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
