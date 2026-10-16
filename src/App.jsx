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

export function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(isAuthenticated ? 'dashboard' : 'landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReportSession, setSelectedReportSession] = useState(null);

  // Auto-redirect based on authentication state changes (login/logout)
  React.useEffect(() => {
    if (isAuthenticated && (currentPage === 'landing' || currentPage.startsWith('auth-'))) {
      setCurrentPage('dashboard');
    } else if (!isAuthenticated && currentPage !== 'landing' && !currentPage.startsWith('auth-')) {
      setCurrentPage('landing');
    }
  }, [isAuthenticated, currentPage]);

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    // If a user lands on 'dashboard' (or default) and is authenticated, enforce portal routing
    if ((currentPage === 'dashboard' || currentPage === '') && user) {
      if (user?.campus?.role === 'TUTOR') return <TutorDashboard initialTab="overview" onNavigate={handleNavigate} />;
      if (user?.campus?.role === 'SUPER_ADMIN') return <RegistrarDashboard />;
      if (user?.campus?.role === 'COLLEGE_ADMIN') return <CollegeAdminDashboard />;
      if (user?.campus?.role === 'HR') return <HRDashboard initialTab="overview" onNavigate={handleNavigate} />;
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
      case 'registrar':
        return <RegistrarDashboard />;
      case 'college-admin':
        return <CollegeAdminDashboard />;
      case 'tutor':
      case 'teacher-dashboard':
        return <TutorDashboard initialTab="overview" onNavigate={handleNavigate} />;
      case 'teacher-batches':
        return <TutorDashboard initialTab="my batches" onNavigate={handleNavigate} />;
      case 'teacher-students':
        return <TutorDashboard initialTab="students" onNavigate={handleNavigate} />;
      case 'teacher-analytics':
        return <TutorDashboard initialTab="analytics" onNavigate={handleNavigate} />;
      case 'teacher-profile':
        return <TutorDashboard initialTab="profile" onNavigate={handleNavigate} />;
      case 'hr':
      case 'hr-dashboard':
        return <HRDashboard initialTab="overview" onNavigate={handleNavigate} />;
      case 'hr-jobs':
        return <HRDashboard initialTab="jobs" onNavigate={handleNavigate} />;
      case 'hr-candidates':
        return <HRDashboard initialTab="candidates" onNavigate={handleNavigate} />;
      case 'hr-interviews':
        return <HRDashboard initialTab="interviews" onNavigate={handleNavigate} />;
      case 'hr-analytics':
        return <HRDashboard initialTab="analytics" onNavigate={handleNavigate} />;
      case 'hr-profile':
        return <HRDashboard initialTab="profile" onNavigate={handleNavigate} />;
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'auth-login':
        return <UnifiedAuth initialMode="login" onNavigate={handleNavigate} />;
      case 'auth-signup':
        return <UnifiedAuth initialMode="signup" onNavigate={handleNavigate} />;
      default:
        // Fallback for unrecognized routes
        if (!isAuthenticated) return <LandingPage onNavigate={handleNavigate} />;
        
        // Enforce role dashboards on fallback
        if (user?.campus?.role === 'TUTOR') return <TutorDashboard initialTab="overview" onNavigate={handleNavigate} />;
        if (user?.campus?.role === 'SUPER_ADMIN') return <RegistrarDashboard />;
        if (user?.campus?.role === 'COLLEGE_ADMIN') return <CollegeAdminDashboard />;
        if (user?.campus?.role === 'HR') return <HRDashboard />;
        return <Dashboard onNavigate={handleNavigate} onSelectSessionReport={setSelectedReportSession} />;
    }
  };

  const isAuthRoute = currentPage === 'landing' || currentPage.startsWith('auth-');

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


