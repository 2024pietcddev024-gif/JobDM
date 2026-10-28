import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import { AptitudeProvider } from './context/AptitudeContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';

import Dashboard from './pages/Dashboard';
import NewInterview from './pages/NewInterview';
import InterviewSession from './pages/InterviewSession';
import InterviewReport from './pages/InterviewReport';
import History from './pages/History';
import CodingSandbox from './pages/CodingSandbox';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Aptitude from './pages/Aptitude';
import AptitudeSetup from './pages/AptitudeSetup';
import AptitudeQuiz from './pages/AptitudeQuiz';
import AptitudeResult from './pages/AptitudeResult';
import RegistrarDashboard from './pages/RegistrarDashboard';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';
import TutorDashboard from './pages/TutorDashboard';
import HRDashboard from './pages/HRDashboard';
import LandingPage from './pages/LandingPage';
import UnifiedAuth from './pages/UnifiedAuth';
import StudentJobs from './pages/StudentJobs';

import { ShieldAlert } from 'lucide-react';

export const getDashboardForRole = (role) => {
  switch (role) {
    case 'TUTOR':
      return 'teacher-dashboard';
    case 'HR':
      return 'hr-dashboard';
    case 'SUPER_ADMIN':
      return 'registrar-overview';
    case 'COLLEGE_ADMIN':
      return 'college-admin-overview';
    case 'STUDENT':
    default:
      return 'dashboard';
  }
};

function AccessDenied({ role, onNavigate }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-['Outfit']">Access Denied</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        You do not have permission to access this resource with your current account privileges.
      </p>
      <button
        onClick={() => onNavigate(getDashboardForRole(role))}
        className="px-6 py-2.5 rounded-xl glow-btn text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30"
      >
        Go to Your Dashboard
      </button>
    </div>
  );
}

export function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(isAuthenticated ? getDashboardForRole(user?.campus?.role) : 'landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReportSession, setSelectedReportSession] = useState(null);

  // Auto-redirect based on authentication state changes (login/logout)
  React.useEffect(() => {
    if (isAuthenticated && (currentPage === 'landing' || currentPage.startsWith('auth-') || currentPage === 'admin-login' || currentPage === 'admin')) {
      const targetDashboard = getDashboardForRole(user?.campus?.role);
      setCurrentPage(targetDashboard);
    } else if (!isAuthenticated && currentPage !== 'landing' && !currentPage.startsWith('auth-') && currentPage !== 'admin-login' && currentPage !== 'admin') {
      setCurrentPage('landing');
    }
  }, [isAuthenticated, user?.campus?.role, currentPage]);

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    const role = user?.campus?.role || 'STUDENT';
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isTeacher = role === 'TUTOR' || isSuperAdmin;
    const isHR = role === 'HR' || isSuperAdmin;
    const isCollegeAdmin = role === 'COLLEGE_ADMIN' || isSuperAdmin;

    // If a user lands on 'dashboard' (or default) and is authenticated, enforce portal routing
    if ((currentPage === 'dashboard' || currentPage === '') && user) {
      if (role === 'TUTOR') return <TutorDashboard initialTab="overview" onNavigate={handleNavigate} />;
      if (role === 'SUPER_ADMIN') return <RegistrarDashboard initialTab="overview" onNavigate={handleNavigate} />;
      if (role === 'COLLEGE_ADMIN') return <CollegeAdminDashboard initialTab="overview" onNavigate={handleNavigate} />;
      if (role === 'HR') return <HRDashboard initialTab="overview" onNavigate={handleNavigate} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onSelectSessionReport={setSelectedReportSession} />;
      case 'new-interview':
        return <NewInterview onNavigate={handleNavigate} />;
      case 'interview-session':
        return <InterviewSession onNavigate={handleNavigate} onSessionFinished={setSelectedReportSession} />;
      case 'report':
        return <InterviewReport session={selectedReportSession} onNavigate={handleNavigate} />;
      case 'history':
        return <History onNavigate={handleNavigate} onSelectSessionReport={setSelectedReportSession} />;
      case 'coding-sandbox':
        return <CodingSandbox />;
      case 'aptitude':
        return <Aptitude onNavigate={handleNavigate} />;
      case 'aptitude-setup':
        return <AptitudeSetup onNavigate={handleNavigate} />;
      case 'aptitude-quiz':
        return <AptitudeQuiz onNavigate={handleNavigate} />;
      case 'aptitude-result':
        return <AptitudeResult onNavigate={handleNavigate} />;
      case 'student-jobs':
      case 'jobs':
        return <StudentJobs onNavigate={handleNavigate} />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'profile':
        return <Profile />;

      // Super Admin Protected Routes
      case 'registrar':
      case 'registrar-overview':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="overview" onNavigate={handleNavigate} />;
      case 'registrar-colleges':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="colleges" onNavigate={handleNavigate} />;
      case 'registrar-hrs':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="hrs" onNavigate={handleNavigate} />;
      case 'registrar-teachers':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="teachers" onNavigate={handleNavigate} />;
      case 'registrar-departments':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="departments" onNavigate={handleNavigate} />;
      case 'registrar-batches':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="batches" onNavigate={handleNavigate} />;
      case 'registrar-admins':
        if (!isSuperAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <RegistrarDashboard initialTab="admins" onNavigate={handleNavigate} />;

      // College Admin Protected Routes
      case 'college-admin':
      case 'college-admin-overview':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="overview" onNavigate={handleNavigate} />;
      case 'college-admin-companies':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="companies" onNavigate={handleNavigate} />;
      case 'college-admin-bulk':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="bulk-provision" onNavigate={handleNavigate} />;
      case 'college-admin-college':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="college" onNavigate={handleNavigate} />;
      case 'college-admin-departments':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="departments" onNavigate={handleNavigate} />;
      case 'college-admin-batches':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="batches" onNavigate={handleNavigate} />;
      case 'college-admin-tutors':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="tutors" onNavigate={handleNavigate} />;
      case 'college-admin-students':
        if (!isCollegeAdmin) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <CollegeAdminDashboard initialTab="students" onNavigate={handleNavigate} />;

      // Teacher Protected Routes
      case 'tutor':
      case 'teacher-dashboard':
        if (!isTeacher) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <TutorDashboard initialTab="overview" onNavigate={handleNavigate} />;
      case 'teacher-batches':
        if (!isTeacher) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <TutorDashboard initialTab="my batches" onNavigate={handleNavigate} />;
      case 'teacher-students':
        if (!isTeacher) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <TutorDashboard initialTab="students" onNavigate={handleNavigate} />;
      case 'teacher-analytics':
        if (!isTeacher) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <TutorDashboard initialTab="analytics" onNavigate={handleNavigate} />;
      case 'teacher-profile':
        if (!isTeacher) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <TutorDashboard initialTab="profile" onNavigate={handleNavigate} />;

      // HR Protected Routes
      case 'hr':
      case 'hr-dashboard':
        if (!isHR) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <HRDashboard initialTab="overview" onNavigate={handleNavigate} />;
      case 'hr-jobs':
        if (!isHR) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <HRDashboard initialTab="jobs" onNavigate={handleNavigate} />;
      case 'hr-candidates':
        if (!isHR) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <HRDashboard initialTab="candidates" onNavigate={handleNavigate} />;
      case 'hr-interviews':
        if (!isHR) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <HRDashboard initialTab="interviews" onNavigate={handleNavigate} />;
      case 'hr-analytics':
        if (!isHR) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <HRDashboard initialTab="analytics" onNavigate={handleNavigate} />;
      case 'hr-profile':
        if (!isHR) return <AccessDenied role={role} onNavigate={handleNavigate} />;
        return <HRDashboard initialTab="profile" onNavigate={handleNavigate} />;

      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'auth-login':
      case 'admin-login':
      case 'admin':
        return <UnifiedAuth initialMode="login" onNavigate={handleNavigate} />;
      case 'auth-signup':
        return <UnifiedAuth initialMode="signup" onNavigate={handleNavigate} />;
      default:
        // Fallback for unrecognized routes
        if (!isAuthenticated) return <LandingPage onNavigate={handleNavigate} />;
        
        // Enforce role dashboards on fallback
        if (role === 'TUTOR') return <TutorDashboard initialTab="overview" onNavigate={handleNavigate} />;
        if (role === 'SUPER_ADMIN') return <RegistrarDashboard initialTab="overview" onNavigate={handleNavigate} />;
        if (role === 'COLLEGE_ADMIN') return <CollegeAdminDashboard />;
        if (role === 'HR') return <HRDashboard initialTab="overview" onNavigate={handleNavigate} />;
        return <Dashboard onNavigate={handleNavigate} onSelectSessionReport={setSelectedReportSession} />;
    }
  };

  const isAuthRoute = currentPage === 'landing' || currentPage.startsWith('auth-') || currentPage === 'admin-login' || currentPage === 'admin';

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100">
      {!isAuthRoute && (
        <Navbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
      )}

      <div className="flex flex-1">
        {!isAuthRoute && (
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            isSidebarOpen={isSidebarOpen}
          />
        )}

        <main className={`flex-1 ${isAuthRoute ? '' : 'p-4 lg:p-8 max-w-7xl mx-auto'} w-full`}>
          {renderPage()}
        </main>
      </div>

      <AuthModal />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('JobDM App caught render error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-2xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              An unexpected render issue occurred. Click reload or reset session to restore application state.
            </p>
            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 rounded-xl transition"
              >
                Reset Session
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-500/20"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <InterviewProvider>
            <AptitudeProvider>
              <AppContent />
            </AptitudeProvider>
          </InterviewProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}


