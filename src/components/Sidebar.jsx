import React from 'react';
import { 
  LayoutDashboard, PlayCircle, History, Terminal, Award, Shield, User, HelpCircle 
} from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate, isSidebarOpen }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-interview', label: 'Start Interview', icon: PlayCircle, badge: 'AI Live' },
    { id: 'history', label: 'Past Interviews', icon: History },
    { id: 'coding-sandbox', label: 'Coding Practice', icon: Terminal },
    { id: 'leaderboard', label: 'Leaderboard', icon: Award },
    { id: 'profile', label: 'My Profile', icon: User }
  ];


  return (
    <aside
      className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 glass-card border-r border-white/10 p-4 transition-transform duration-300 flex flex-col justify-between ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="space-y-1.5">
        <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-indigo-400/80'
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20">
        <div className="flex items-center gap-2 mb-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white">InterviewIQ Pro</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          AI Interviewer ready with real-time speech, eye-contact analysis & custom resume parsing.
        </p>
      </div>
    </aside>
  );
}
