import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { MOCK_ROLES, MOCK_DIFFICULTIES } from '../mock/mockData';
import ResumeUploader from '../components/ResumeUploader';
import { 
  Server, Layout, Cpu, Brain, BarChart2, Users, Code, 
  Sparkles, Mic, Type, Terminal, CheckCircle2, ArrowRight, Play 
} from 'lucide-react';

const ICON_MAP = {
  Server, Layout, Cpu, Brain, BarChart2, Users, Code
};

export default function NewInterview({ onNavigate }) {
  const { user, updateResumeData } = useAuth();
  const { startNewInterview, interviewError } = useInterview();

  const [selectedCategory, setSelectedCategory] = useState(MOCK_ROLES[0]);
  const [targetRole, setTargetRole] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState(MOCK_DIFFICULTIES[1]);
  const [selectedMode, setSelectedMode] = useState('voice'); // 'voice' | 'text' | 'coding'
  const [questionsCount, setQuestionsCount] = useState(10);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    const result = await startNewInterview({
      category: selectedCategory.title,
      role: targetRole || '',
      difficulty: selectedDifficulty.title,
      resumeData: user?.resumeData || null,
      totalQuestions: questionsCount,
      mode: selectedMode
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> AI Interview Wizard
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Configure Your <span className="gradient-text">AI Mock Interview</span>
        </h1>
        <p className="text-sm text-slate-400">
          Select your target engineering role, difficulty level, and resume attachment to generate adaptive, conversational interview questions.
        </p>
        {interviewError && (
          <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {interviewError}
          </div>
        )}
      </div>

      {/* Step 1: Select Target Role */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
            1
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white font-['Outfit']">Select Category & Target Role</h3>
            <p className="text-xs text-slate-400">Choose the field you want to practice for, and optionally specify an exact role</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_ROLES.map((role) => {
            const Icon = ICON_MAP[role.icon] || Code;
            const isSelected = selectedCategory.id === role.id;

            return (
              <div
                key={role.id}
                onClick={() => setSelectedCategory(role)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'glass-card border-indigo-500 bg-indigo-600/15 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {role.popular && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Popular
                  </span>
                )}
                <div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-gradient-to-tr ${role.color} text-white shadow-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1 group-hover:text-indigo-300 transition-colors">
                    {role.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {role.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 pt-2 border-t border-white/10">
                  {role.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Specific Target Role (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Senior Node.js Developer, React Native Engineer..." 
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-sm"
          />
        </div>
      </div>

      {/* Step 2: Select Difficulty & Interview Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Selector */}
        <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
              2
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-['Outfit']">Experience Level</h3>
              <p className="text-xs text-slate-400">Question depth & expectation tier</p>
            </div>
          </div>

          <div className="space-y-3">
            {MOCK_DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty.id === diff.id;
              return (
                <div
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{diff.title}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {diff.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{diff.desc}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode Selector */}
        <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
              3
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-['Outfit']">Interview Interaction Mode</h3>
              <p className="text-xs text-slate-400">Choose voice, text, or live coding</p>
            </div>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => setSelectedMode('voice')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                selectedMode === 'voice' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <Mic className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Voice Interview (Recommended)</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Full Audio</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Speech-to-Text answer analysis & Text-to-Speech AI voice interviewer</p>
              </div>
            </div>

            <div
              onClick={() => setSelectedMode('text')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                selectedMode === 'text' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Type className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">Text Mode</h4>
                <p className="text-xs text-slate-400 mt-0.5">Type responses directly into input box</p>
              </div>
            </div>

            <div
              onClick={() => setSelectedMode('coding')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                selectedMode === 'coding' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">Coding Interview Mode</h4>
                <p className="text-xs text-slate-400 mt-0.5">Live code editor workspace with instant test suite execution</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Resume Personalization */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
              4
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-['Outfit']">Resume Personalization (Optional)</h3>
              <p className="text-xs text-slate-400">AI will ask tailored questions based on your projects & skills</p>
            </div>
          </div>
        </div>

        <ResumeUploader
          currentResume={user?.resumeData}
          onResumeParsed={(parsedData) => updateResumeData(parsedData)}
        />
      </div>

      {/* Launch Button Bar */}
      <div className="glass-card rounded-3xl p-6 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-extrabold text-white text-lg font-['Outfit']">Ready for {targetRole || selectedCategory.title}?</h4>
          <p className="text-xs text-slate-400">
            {selectedDifficulty.title} Level • {selectedMode.toUpperCase()} Mode • 10 Questions Assessment
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={isStarting}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl glow-btn text-white font-extrabold text-base shadow-2xl hover:scale-105 transition-all"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>{isStarting ? 'Generating Interview...' : 'Start AI Interview Now'}</span>
        </button>
      </div>
    </div>
  );
}
