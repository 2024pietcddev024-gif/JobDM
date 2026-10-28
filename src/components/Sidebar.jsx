import React from 'react';
import { 
  LayoutDashboard, PlayCircle, History, Terminal, Award, User, 
  HelpCircle, Brain, ShieldCheck, Building2, BookOpen, Users, 
  Briefcase, Calendar, BarChart3, Settings, FileSpreadsheet, GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentPage, onNavigate, isSidebarOpen }) {
  const { user } = useAuth();
  let menuItems = [];

  if (user?.campus?.role === 'SUPER_ADMIN') {
    menuItems = [
      { id: 'registrar-overview', label: 'Platform Overview', icon: LayoutDashboard },
      { id: 'registrar-colleges', label: 'Colleges & Licenses', icon: Building2, badge: 'Clients' },
      { id: 'registrar-hrs', label: 'HR & Companies', icon: Briefcase, badge: 'Partners' },
      { id: 'registrar-teachers', label: 'Faculty & Teachers', icon: Users },
      { id: 'registrar-departments', label: 'Departments', icon: BookOpen },
      { id: 'registrar-batches', label: 'Batches', icon: Calendar },
      { id: 'registrar-admins', label: 'College Admins', icon: ShieldCheck }
    ];
  } else if (user?.campus?.role === 'COLLEGE_ADMIN') {
    menuItems = [
      { id: 'college-admin-overview', label: 'Admin Overview', icon: LayoutDashboard },
      { id: 'college-admin-bulk', label: 'Bulk Onboarding', icon: FileSpreadsheet, badge: 'Roster' },
      { id: 'college-admin-college', label: 'College Info', icon: Building2 },
      { id: 'college-admin-departments', label: 'Departments', icon: BookOpen },
      { id: 'college-admin-batches', label: 'Batches', icon: Calendar },
      { id: 'college-admin-tutors', label: 'Faculty & Tutors', icon: Users },
      { id: 'college-admin-students', label: 'Enrolled Students', icon: GraduationCap }
    ];
  } else if (user?.campus?.role === 'TUTOR') {
    menuItems = [
      { id: 'teacher-dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'teacher-batches', label: 'My Batches', icon: Building2 },
      { id: 'teacher-students', label: 'My Students', icon: Users },
      { id: 'teacher-analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'teacher-profile', label: 'Teacher Profile', icon: User }
    ];
  } else if (user?.campus?.role === 'HR') {
    menuItems = [
      { id: 'hr-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'hr-jobs', label: 'Jobs', icon: Briefcase },
      { id: 'hr-candidates', label: 'Candidates', icon: Users },
      { id: 'hr-interviews', label: 'Interviews', icon: Calendar },
      { id: 'hr-analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'hr-profile', label: 'Profile', icon: Settings }
    ];
  } else {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'student-jobs', label: 'Campus Jobs', icon: Briefcase, badge: 'Hiring' },
      { id: 'new-interview', label: 'Start Interview', icon: PlayCircle, badge: 'AI Live' },
      { id: 'history', label: 'Past Interviews', icon: History },
      { id: 'coding-sandbox', label: 'Coding Practice', icon: Terminal },
      { id: 'aptitude', label: 'Aptitude', icon: Brain },
      { id: 'leaderboard', label: 'Leaderboard', icon: Award },
      { id: 'profile', label: 'My Profile', icon: User }
    ];
  }


  return (
    <aside
      className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 glass-card border-r border-slate-300 dark:border-white/10 p-4 transition-transform duration-300 flex flex-col justify-between ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="space-y-1.5">
        <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || 
            ((currentPage === 'dashboard' || currentPage === 'college-admin') && item.id === 'college-admin-overview') ||
            ((currentPage === 'dashboard' || currentPage === 'registrar') && item.id === 'registrar-overview');

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/90 text-indigo-700 dark:text-white shadow-sm dark:shadow-lg shadow-indigo-200 dark:shadow-indigo-600/30 font-semibold border border-indigo-100 dark:border-transparent'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-indigo-600 dark:text-white' : 'text-indigo-600 dark:text-indigo-400/80'
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 dark:bg-white/20 text-indigo-700 dark:text-white' : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Banner */}
      {user?.campus?.role === 'SUPER_ADMIN' ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/40 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Master Admin Control</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Full authority over institution licensing, campus onboarding & enterprise HR provisioning.
          </p>
        </div>
      ) : user?.campus?.role === 'COLLEGE_ADMIN' ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">College Admin Portal</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage your institution's departments, faculty, student rosters, and batch analytics.
          </p>
        </div>
      ) : user?.campus?.role === 'TUTOR' ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">JobDM for Teachers</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage your batches, monitor student progress, and analyze interview performance.
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">JobDM Pro</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            AI Interviewer ready with real-time speech, eye-contact analysis & custom resume parsing.
          </p>
        </div>
      )}
    </aside>
  );
}
