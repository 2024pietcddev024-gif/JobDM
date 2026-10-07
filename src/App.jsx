import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import { AptitudeProvider } from './context/AptitudeContext';
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

export function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReportSession, setSelectedReportSession] = useState(null);

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
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
      case 'leaderboard':
        return <Leaderboard />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onNavigate={handleNavigate} onSelectSessionReport={setSelectedReportSession} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex flex-1">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isSidebarOpen={isSidebarOpen}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {renderPage()}
        </main>
      </div>

      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <AptitudeProvider>
          <AppContent />
        </AptitudeProvider>
      </InterviewProvider>
    </AuthProvider>
  );
}
