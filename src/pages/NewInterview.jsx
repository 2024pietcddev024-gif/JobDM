import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { MOCK_ROLES, MOCK_DIFFICULTIES } from '../mock/mockData';
import ResumeUploader from '../components/ResumeUploader';
import { 
  Server, Layout, Cpu, Brain, BarChart2, Users, Code, 
  Sparkles, Mic, Type, Terminal, CheckCircle2, ArrowRight, Play, Lock
} from 'lucide-react';

const ICON_MAP = {
  Server, Layout, Cpu, Brain, BarChart2, Users, Code
};

const PROGRAMMING_LANGUAGES = [
  { id: 'python', name: 'Python', desc: 'Popular for DSA, AI/ML and backend' },
  { id: 'java', name: 'Java', desc: 'Common in enterprise and backend development' },
  { id: 'cpp', name: 'C++', desc: 'Popular for competitive programming and DSA' },
  { id: 'javascript', name: 'JavaScript', desc: 'Useful for web development and frontend/backend' },
  { id: 'typescript', name: 'TypeScript', desc: 'Typed superset of JavaScript' },
  { id: 'csharp', name: 'C#', desc: 'Popular for enterprise and game development' },
  { id: 'go', name: 'Go', desc: 'Fast, scalable backend language' },
  { id: 'rust', name: 'Rust', desc: 'Systems programming with safety' }
];

export default function NewInterview({ onNavigate }) {
  const { user, updateResumeData } = useAuth();
  const { startNewInterview, interviewError } = useInterview();

  const [selectedCategories, setSelectedCategories] = useState([MOCK_ROLES[0]]);
  const [targetRole, setTargetRole] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState(user?.resumeData ? null : MOCK_DIFFICULTIES[1]);
  const [selectedMode, setSelectedMode] = useState('voice'); 
  const [selectedLanguage, setSelectedLanguage] = useState(user?.resumeData ? null : (user?.preferredCodingLanguage || 'python'));
  const [questionsCount, setQuestionsCount] = useState(10);
  const [isStarting, setIsStarting] = useState(false);

  // Resume Data
  const resumeData = user?.resumeData;
  const hasResume = !!resumeData;
  
  // When resume is uploaded, pre-select available categories (but allow user to modify)
  useEffect(() => {
    if (hasResume && resumeData.categories && resumeData.categories.length > 0) {
      const availableRoles = MOCK_ROLES.filter(role => 
        resumeData.categories.some(cat => role.title.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(role.title.toLowerCase()))
      );
      if (availableRoles.length > 0) {
        setSelectedCategories(availableRoles);
      } else {
        // If no match found, fallback to the first one just to have something selected
        setSelectedCategories([MOCK_ROLES[0]]);
      }
    }
  }, [hasResume, resumeData?.categories]);

  const [userSelectedLanguage, setUserSelectedLanguage] = useState(false);

  // When resume is uploaded, determine preferred coding language
  useEffect(() => {
    if (hasResume && resumeData.programmingLanguages && resumeData.programmingLanguages.length > 0 && !userSelectedLanguage) {
      const detectedLangs = PROGRAMMING_LANGUAGES.filter(lang => 
        resumeData.programmingLanguages.some(l => l.toLowerCase() === lang.name.toLowerCase())
      );
      
      if (detectedLangs.length === 1) {
        setSelectedLanguage(detectedLangs[0].name);
      } else if (detectedLangs.length > 1) {
        // Do not blindly guess, preserve existing default or user's preferred.
      }
    }
  }, [hasResume, resumeData?.programmingLanguages, userSelectedLanguage]);

  const toggleCategory = (role) => {
    setSelectedCategories(prev => {
      const isSelected = prev.some(c => c.id === role.id);
      if (isSelected) return prev.filter(c => c.id !== role.id);
      return [...prev, role];
    });
  };

  const isCategoryAvailable = (role) => {
    // User requested all categories remain available regardless of resume
    return true;
  };

  const isLanguageDetected = (langName) => {
    if (!hasResume || !resumeData.programmingLanguages) return false;
    return resumeData.programmingLanguages.some(l => l.toLowerCase() === langName.toLowerCase());
  };

  const isTechInterview = selectedCategories.length === 0 || selectedCategories.some(c => c.id !== 'hr');

  const handleStart = async () => {
    if (!hasResume && selectedCategories.length === 0) {
      alert("Please upload your resume or select at least one interview category to continue.");
      return;
    }
    
    setIsStarting(true);
    const categoryTitles = selectedCategories.map(c => c.title).join(', ');
    
    let interviewMode = "category";
    if (hasResume && selectedCategories.length === 0) {
      interviewMode = "resume";
    } else if (hasResume && selectedCategories.length > 0) {
      interviewMode = "resume_and_category";
    }
    
    const result = await startNewInterview({
      category: categoryTitles,
      role: targetRole || categoryTitles,
      difficulty: selectedDifficulty?.title || null,
      resumeData: hasResume ? resumeData : null,
      totalQuestions: questionsCount,
      mode: selectedMode,
      codingLanguage: isTechInterview ? selectedLanguage : null,
      interviewMode: interviewMode
    });
    setIsStarting(false);
    if (result?.success !== false) {
      onNavigate('interview-session');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> AI Interview Wizard
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
          Configure Your <span className="gradient-text">AI Mock Interview</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload your resume for a personalized interview, or manually configure your target engineering role and difficulty level.
        </p>
        {interviewError && (
          <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-indigo-300 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
            {interviewError}
          </div>
        )}
      </div>

      {/* Step 1: Resume Personalization (TOP OF PAGE) */}
      <div className="rounded-3xl p-6 lg:p-8 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center font-black text-sm border border-violet-200 dark:border-violet-500/30">
              1
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Resume-Based Personalization</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Upload your resume and let AI personalize the interview automatically.</p>
            </div>
          </div>
        </div>
        
        <ResumeUploader
          currentResume={user?.resumeData}
          onResumeParsed={(parsedData) => {
            updateResumeData(parsedData);
            setSelectedDifficulty(null);
            setSelectedLanguage(null);
            setUserSelectedLanguage(false);
          }}
        />
        
        {hasResume ? (
          <div className="text-center mt-2">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">✓ Resume uploaded & analyzed</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Your interview can now be personalized entirely from your resume.</p>
          </div>
        ) : (
          <div className="text-center mt-2">
            <span className="text-xs text-slate-500 font-medium">Optional: You can skip resume upload and manually select categories below.</span>
          </div>
        )}
      </div>

      {/* Step 2: Select Target Role */}
      <div className="rounded-3xl p-6 lg:p-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-sm border border-blue-200 dark:border-blue-500/30">
            2
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Interview Categories {hasResume ? '(Optional)' : ''}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {hasResume 
                ? 'Leave these settings empty and JobDM will automatically personalize your interview from your resume.' 
                : 'Choose one or more fields you want to practice for.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_ROLES.map((role) => {
            const Icon = ICON_MAP[role.icon] || Code;
            const isSelected = selectedCategories.some(c => c.id === role.id);
            const isAvailable = isCategoryAvailable(role);

            return (
              <div
                key={role.id}
                onClick={() => toggleCategory(role)}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  !isAvailable 
                    ? 'bg-slate-200/50 dark:bg-black/40 border-slate-200 dark:border-white/5 opacity-50 cursor-not-allowed'
                    : isSelected
                      ? 'bg-indigo-100/90 dark:bg-indigo-600/30 border-2 border-indigo-600 shadow-lg scale-[1.02] cursor-pointer'
                      : 'bg-white dark:bg-white/5 border-blue-200/60 dark:border-white/10 hover:border-blue-400 hover:bg-blue-100/40 cursor-pointer shadow-xs'
                }`}
              >
                {!isAvailable && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">
                    <div className="bg-slate-900/80 dark:bg-black/80 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-300 dark:border-white/10">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-semibold text-slate-300">Not detected in resume</span>
                    </div>
                  </div>
                )}
                {isAvailable && hasResume && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Detected
                  </span>
                )}
                <div className={`${!isAvailable ? 'opacity-40' : ''}`}>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-gradient-to-tr ${role.color} text-white shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base transition-colors">
                      {role.title}
                    </h4>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 font-medium">
                    {role.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-blue-200 dark:border-white/10 pt-4">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Specific Target Role (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Senior Node.js Developer, React Native Engineer..." 
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Step 3: Programming Language */}
      {isTechInterview && (
        <div className="rounded-3xl p-6 lg:p-8 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-black text-sm border border-cyan-200 dark:border-cyan-500/30">
              3
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Programming Language {hasResume ? '(Optional)' : ''}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {hasResume ? 'AI will infer your language from your resume if left unselected. Click to select/unselect.' : 'Select your preferred language.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PROGRAMMING_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.name;
              const detected = isLanguageDetected(lang.name);
              
              return (
                <div
                  key={lang.id}
                  onClick={() => {
                    if (hasResume && isSelected) {
                      setSelectedLanguage(null);
                    } else {
                      setSelectedLanguage(lang.name);
                    }
                    setUserSelectedLanguage(true);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-cyan-100/90 dark:bg-cyan-600/30 border-2 border-cyan-600 shadow-md scale-[1.02]'
                      : 'bg-white dark:bg-white/5 border-cyan-200/60 dark:border-white/10 hover:bg-cyan-100/40 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-bold text-sm ${isSelected ? 'text-cyan-900 dark:text-cyan-200' : 'text-slate-900 dark:text-white'}`}>
                      {lang.name}
                    </h4>
                    {detected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        Detected
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {lang.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Difficulty & Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl p-6 lg:p-8 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-500/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 flex items-center justify-center font-black text-sm border border-pink-200 dark:border-pink-500/30">
              4
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Experience Level {hasResume ? '(Optional)' : ''}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {hasResume ? 'AI will determine difficulty from your resume if left unselected.' : 'Question depth & expectation tier'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {MOCK_DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty?.id === diff.id;
              return (
                <div
                  key={diff.id}
                  onClick={() => {
                    if (hasResume && isSelected) {
                      setSelectedDifficulty(null);
                    } else {
                      setSelectedDifficulty(diff);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-pink-100/90 dark:bg-pink-600/30 border-2 border-pink-500 shadow-md'
                      : 'bg-white dark:bg-white/5 border-pink-200/60 dark:border-white/10 hover:bg-pink-100/40 hover:border-pink-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{diff.title}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30">
                        {diff.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">{diff.desc}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl p-6 lg:p-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-sm border border-amber-200 dark:border-amber-500/30">
              5
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-['Outfit']">Interview Mode</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Choose voice, text, or live coding</p>
            </div>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => setSelectedMode('voice')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                selectedMode === 'voice' 
                  ? 'bg-amber-100/90 dark:bg-amber-600/30 border-2 border-amber-500 shadow-md' 
                  : 'bg-white dark:bg-white/5 border-amber-200/60 dark:border-white/10 hover:bg-amber-100/40 hover:border-amber-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-500/30">
                <Mic className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Voice Interview</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">Recommended</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => setSelectedMode('text')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                selectedMode === 'text' 
                  ? 'bg-amber-100/90 dark:bg-amber-600/30 border-2 border-amber-500 shadow-md' 
                  : 'bg-white dark:bg-white/5 border-amber-200/60 dark:border-white/10 hover:bg-amber-100/40 hover:border-amber-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-500/30">
                <Type className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Text Mode</h4>
              </div>
            </div>

            <div
              onClick={() => setSelectedMode('coding')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                selectedMode === 'coding' 
                  ? 'bg-amber-100/90 dark:bg-amber-600/30 border-2 border-amber-500 shadow-md' 
                  : 'bg-white dark:bg-white/5 border-amber-200/60 dark:border-white/10 hover:bg-amber-100/40 hover:border-amber-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Coding Interview Mode</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Button Bar */}
      <div className="rounded-3xl p-6 lg:p-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-500/30 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="font-black text-slate-900 dark:text-white text-lg font-['Outfit']">Ready to begin?</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
            {selectedCategories.length > 0 ? selectedCategories.map(c => c.title).join(', ') : 'Resume-based Topics'} • 
            {selectedDifficulty ? ` ${selectedDifficulty.title} Level ` : ' Auto-scaled Difficulty '} • 
            {selectedMode.toUpperCase()} Mode 
            {isTechInterview && (selectedLanguage ? ` • ${selectedLanguage}` : ' • Auto-detected Language')}
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={isStarting}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl glow-btn text-white font-black text-base shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>{isStarting ? 'Generating Interview...' : 'Start AI Interview Now'}</span>
        </button>
      </div>
    </div>
  );
}
