import React, { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import { Code, Sparkles, CheckCircle2, Search, BookOpen, ChevronDown, List, ChevronRight, MessageSquare, AlertTriangle, Lightbulb, BarChart2, Calendar, Copy, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Normalize a DB row (snake_case) to the shape the UI expects (camelCase)
function normalizeDbProblem(row) {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    difficulty: row.difficulty,
    // keep both so existing JSX that uses either name works
    description: row.description,
    inputFormat: row.input_format,
    outputFormat: row.output_format,
    constraints: Array.isArray(row.constraints) ? row.constraints : (row.constraints || []),
    hints: Array.isArray(row.hints) ? row.hints : (row.hints || []),
    starterCode: row.starter_code || {},
    // DB problems don't have a caseStudy or edgeCases field; default gracefully
    caseStudy: null,
    edgeCases: [],
    examples: row.examples || [],
    // tags for the problem list pill
    tags: row.topic ? [row.topic] : [],
    category: row.topic || '',
    // testCases are NOT fetched (hidden server-side); leave empty for Run panel
    testCases: []
  };
}

export default function CodingSandbox() {
  const { user } = useAuth();

  // Problem library — loaded from DB
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [problemsError, setProblemError] = useState(null);

  const [activeProblem, setActiveProblem] = useState(null); // set after fetch
  const [progressData, setProgressData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('problem'); // 'problem', 'hints', 'review'
  const [aiReview, setAiReview] = useState(null);
  const [revealedHintsCount, setRevealedHintsCount] = useState(0);

  useEffect(() => {
    if (activeProblem) {
      setRevealedHintsCount(0);
      const token = localStorage.getItem('interviewiq_token');
      if (token && activeProblem.id) {
        fetch(`${API_URL}/code/record-served`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ problemId: activeProblem.id })
        }).catch(() => {});
      }
    }
  }, [activeProblem?.id]);

  // Problem List Modal / Dropdown State
  const [showProblemList, setShowProblemList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterTopic, setFilterTopic] = useState('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Completed Questions tab filters
  const [completedFilterDiff, setCompletedFilterDiff] = useState('All');
  const [completedFilterTopic, setCompletedFilterTopic] = useState('All');

  const fetchProblems = async () => {
    setProblemsLoading(true);
    setProblemError(null);
    try {
      const res = await fetch(`${API_URL}/code/problems`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.problems && data.problems.length > 0) {
        const normalized = data.problems.map(normalizeDbProblem);
        setProblems(normalized);
        setActiveProblem(normalized[0]);
      } else {
        setProblems([]);
        setActiveProblem(null);
        setProblemError('No problems found in library.');
      }
    } catch (e) {
      console.error('[CodingSandbox] Failed to load problems:', e);
      setProblems([]);
      setActiveProblem(null);
      setProblemError('Could not load problem library. Please try again later.');
    } finally {
      setProblemsLoading(false);
    }
  };

  // Fetch problem library from DB on mount
  useEffect(() => {
    fetchProblems();
    fetchProgress();
  }, []);

  const handleGenerateChallenge = async () => {
    if (filterTopic === 'All' || filterDifficulty === 'All') {
      setGenerateError('Please select a specific Topic and Difficulty to generate a new challenge.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    try {
      const token = localStorage.getItem('interviewiq_token');
      const res = await fetch(`${API_URL}/code/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: filterTopic, difficulty: filterDifficulty })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate problem.');
      }

      // Add to local problems array and switch to it
      setProblems(prev => [data.problem, ...prev]);
      setActiveProblem(data.problem);
      setShowProblemList(false);
      setActiveTab('problem');
      setAiReview(null);
    } catch (err) {
      console.error('Generation error:', err);
      setGenerateError(err.message || 'AI coding question generation is temporarily unavailable. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchProgress = async () => {
    const token = localStorage.getItem('interviewiq_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/code/progress`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setProgressData(data); // Set full data object
    } catch (e) {
      console.error('Failed to fetch code progress', e);
    }
  };

  const handleCodeSubmit = async (language, code) => {
    if (!activeProblem) return;
    setIsSubmitting(true);
    setAiReview(null);
    setActiveTab('review');

    const token = localStorage.getItem('interviewiq_token');
    let execResult;

    // ── Step 1: Authoritative server-side evaluation ──────────────────────────
    // /api/code/submit runs DB test cases, logs the attempt, and writes
    // coding_solved if all tests pass. We never trust client-supplied status.
    try {
      const submitRes = await fetch(`${API_URL}/code/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ problemId: activeProblem.id, language, code })
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json().catch(() => ({}));
        const isAuth = submitRes.status === 401 || submitRes.status === 403;
        setAiReview({
          verdict: isAuth ? 'error' : 'error',
          summary: isAuth
            ? 'Session expired. Please log in again to submit.'
            : errData.error || `Submission failed (${submitRes.status}).`,
          yourApproach: '', expectedApproach: '', difference: '', howToImprove: ''
        });
        setIsSubmitting(false);
        return;
      }

      execResult = await submitRes.json();

      // Incomplete / placeholder code — surface inline, do not continue
      if (execResult.status === 'incomplete') {
        setAiReview({ verdict: 'error', summary: execResult.error, strengths: [], improvements: [] });
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      const isNetwork = e.message === 'Failed to fetch' || e.message.includes('NetworkError');
      setAiReview({
        verdict: isNetwork ? 'network_error' : 'error',
        summary: isNetwork
          ? 'Execution Service Unavailable. Unable to connect.'
          : 'Failed to submit code.',
        yourApproach: '', expectedApproach: '', difference: '', howToImprove: ''
      });
      setIsSubmitting(false);
      return;
    }

    // ── Step 2: Optional AI narrative review ─────────────────────────────────
    // AI review is purely cosmetic — it cannot alter the solved/unsolved status
    // already recorded by /submit above. Progress refresh happens regardless.
    try {
      const reviewRes = await fetch(`${API_URL}/interviews/evaluate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          problemTitle: activeProblem.title,
          problemDescription: activeProblem.description,
          inputFormat: activeProblem.inputFormat,
          outputFormat: activeProblem.outputFormat,
          constraints: Array.isArray(activeProblem.constraints)
            ? activeProblem.constraints.join(', ')
            : '',
          examples: activeProblem.examples || [],
          language,
          code,
          testResult: execResult
        })
      });
      const reviewData = await reviewRes.json();
      
      let baseVerdict = 'incorrect';
      if (execResult.status === 'success') baseVerdict = 'correct';
      else if (execResult.status === 'compilation_error') baseVerdict = 'compilation_error';
      else if (execResult.status === 'runtime_error') baseVerdict = 'runtime_error';
      else if (execResult.status === 'time_limit_exceeded') baseVerdict = 'timeout';

      setAiReview({
        ...reviewData,
        verdict: baseVerdict
      });
    } catch (e) {
      let baseVerdict = 'incorrect';
      if (execResult.status === 'success') baseVerdict = 'correct';
      else if (execResult.status === 'compilation_error') baseVerdict = 'compilation_error';
      else if (execResult.status === 'runtime_error') baseVerdict = 'runtime_error';
      else if (execResult.status === 'time_limit_exceeded') baseVerdict = 'timeout';

      setAiReview({
        verdict: baseVerdict,
        summary: execResult.error || `${execResult.passedCount || 0}/${execResult.totalCount || 0} test cases passed. AI analysis could not be generated.`,
        userApproach: '', expectedApproach: '', difference: '', improvementSuggestions: ''
      });
    } finally {
      // Always refresh progress — /submit already wrote to DB
      fetchProgress();
      setIsSubmitting(false);
    }
  };

  const filteredProblems = problems.filter(p => {
    if (filterDifficulty !== 'All' && p.difficulty !== filterDifficulty) return false;
    if (filterTopic !== 'All' && p.category !== filterTopic) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (filterTopic !== 'All' && filterDifficulty !== 'All' && problems.length > 0 && progressData) {
      const unusedCount = filteredProblems.filter(p => !progressData.servedList?.includes(p.id)).length;
      if (unusedCount === 0 && !isGenerating && !generateError) {
        handleGenerateChallenge();
      }
    }
  }, [filterTopic, filterDifficulty, problems.length, progressData?.servedList]);

  const uniqueTopics = ['All', ...new Set(problems.map(p => p.category).filter(Boolean))];

  const getDifficultyColor = (diff) => {
    if (diff === 'Easy') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (diff === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  // Guard: problems are loading or activeProblem is not yet set
  if (problemsLoading || !activeProblem) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center gap-4 text-slate-400">
        <Sparkles className="w-8 h-8 animate-pulse text-indigo-400" />
        <p className="text-sm font-semibold">Loading problem library...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-300">

      {/* API Error Banner (mock fallback active) */}
      {problemsError && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{problemsError}</span>
        </div>
      )}

      {/* Top Header Navigation */}

      <div className="flex items-center justify-between bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 mb-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowProblemList(!showProblemList)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all border border-white/5"
          >
            <List className="w-4 h-4 text-indigo-400" />
            Problems List
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          <div className="h-6 w-px bg-white/10"></div>
          <h2 className="font-extrabold text-white text-lg font-['Outfit']">{activeProblem.title}</h2>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDifficultyColor(activeProblem.difficulty)}`}>
            {activeProblem.difficulty}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('hints')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all border border-amber-500/20">
            <Lightbulb className="w-4 h-4" /> Hint
          </button>
        </div>
      </div>

      {/* Problem List Dropdown / Modal Overlay */}
      {showProblemList && (
        <div className="absolute top-24 left-8 z-50 w-96 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 max-h-[60vh]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Select Challenge</h3>
            <button onClick={() => setShowProblemList(false)} className="text-slate-400 hover:text-white text-xs">Close</button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
              <button 
                onClick={() => { setSearchQuery(''); setFilterDifficulty('All'); setFilterTopic('All'); }}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs text-white transition-colors"
                title="Clear Filters"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white">
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white">
                {uniqueTopics.map(topic => (
                  <option key={topic} value={topic}>{topic === 'All' ? 'All Topics' : topic}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-y-auto space-y-2 pr-1">
            {filteredProblems.map(p => {
              const isSolved = progressData?.solvedList?.some(s => s.problemId === p.id);
              return (
                <div 
                  key={p.id} 
                  onClick={() => { setActiveProblem(p); setShowProblemList(false); setActiveTab('problem'); setAiReview(null); }}
                  className={`p-3 rounded-xl cursor-pointer border ${activeProblem.id === p.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      {p.title}
                      {isSolved && <CheckCircle2 className="w-3 h-3 text-emerald-500" title="Solved" />}
                    </h4>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getDifficultyColor(p.difficulty)}`}>{p.difficulty}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{p.category}</p>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-white/10">
            {generateError && <p className="text-xs text-rose-400 mb-2">{generateError}</p>}
            <button
              onClick={handleGenerateChallenge}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all"
            >
              {isGenerating ? (
                <><Sparkles className="w-4 h-4 animate-pulse" /> Generating new challenge...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate New Challenge</>
              )}
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-1">Select a specific Topic and Difficulty above to generate a new AI-powered problem.</p>
          </div>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        
        {/* Left Pane: Description / Review / Hints */}
        <div className="glass-card rounded-2xl border border-white/10 flex flex-col overflow-hidden bg-slate-900/40">
          <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto">
            <button onClick={() => setActiveTab('problem')} className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'problem' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <BookOpen className="w-4 h-4" /> Description
            </button>
            <button onClick={() => setActiveTab('hints')} className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'hints' ? 'border-amber-500 text-amber-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <Lightbulb className="w-4 h-4" /> Hints
            </button>
            <button onClick={() => setActiveTab('review')} className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'review' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <Sparkles className="w-4 h-4" /> AI Review
            </button>
            <button onClick={() => setActiveTab('completed')} className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'completed' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <CheckCircle2 className="w-4 h-4" /> Completed
            </button>
            <button onClick={() => setActiveTab('progress')} className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === 'progress' ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <BarChart2 className="w-4 h-4" /> My Stats
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-sm text-slate-300 space-y-6">
            {activeTab === 'problem' && (
              <>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {activeProblem.tags?.map(t => <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-semibold text-slate-400">{t}</span>)}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" /> Case Study
                  </h3>
                  <p className="leading-relaxed bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20 text-indigo-100/80">{activeProblem.caseStudy}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-white font-bold text-base">Problem Statement</h3>
                  <p className="leading-relaxed">{activeProblem.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Input Format</h4>
                    <p className="text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/5 text-slate-300 whitespace-pre-wrap">{activeProblem.inputFormat}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Output Format</h4>
                    <p className="text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/5 text-slate-300 whitespace-pre-wrap">{activeProblem.outputFormat}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-bold text-base">Examples</h3>
                  {activeProblem.examples?.map((ex, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                      <p className="text-xs font-bold text-white mb-1">Example {i + 1}:</p>
                      <div className="text-xs font-mono text-emerald-300"><span className="text-slate-500 select-none">Input: </span>{ex.input}</div>
                      <div className="text-xs font-mono text-indigo-300"><span className="text-slate-500 select-none">Output: </span>{ex.output}</div>
                      {ex.explanation && <div className="text-xs text-slate-400 mt-2 border-t border-white/10 pt-2"><span className="font-semibold text-slate-300">Explanation:</span> {ex.explanation}</div>}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Constraints & Edge Cases
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 ml-2">
                    {activeProblem.constraints?.map((c, i) => <li key={'c'+i} className="font-mono bg-black/20 px-1 py-0.5 rounded inline-block mb-1">{c}</li>)}
                  </ul>
                  <div className="mt-2">
                    <span className="text-xs font-bold text-slate-300">Consider Edge Cases:</span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 ml-2 mt-1">
                      {activeProblem.edgeCases?.map((c, i) => <li key={'e'+i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'hints' && (
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" /> Need a push?
                </h3>
                {activeProblem.hints && activeProblem.hints.length > 0 ? (
                  <>
                    {activeProblem.hints.slice(0, revealedHintsCount).map((hint, i) => (
                      <div key={i} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-xs font-bold text-amber-300 mb-1">Hint {i + 1}</p>
                        <p className="text-sm text-amber-100/80">{hint}</p>
                      </div>
                    ))}
                    {revealedHintsCount < activeProblem.hints.length && (
                      <button 
                        onClick={() => setRevealedHintsCount(c => c + 1)}
                        className="w-full py-3 mt-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-300 text-sm font-bold transition-all"
                      >
                        Reveal Next Hint ({revealedHintsCount}/{activeProblem.hints.length})
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">No hints available for this problem.</p>
                )}
              </div>
            )}

            {activeTab === 'review' && (
              <div className="space-y-4">
                {isSubmitting ? (
                  <div className="flex flex-col items-center justify-center h-48 space-y-4">
                    <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                    <p className="text-sm font-bold text-indigo-300 animate-pulse">Evaluating your solution...</p>
                    <p className="text-xs text-indigo-400/60">Running test cases and performing AI code review</p>
                  </div>
                ) : aiReview ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      aiReview.verdict === 'correct' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : (aiReview.verdict === 'ai_unavailable' || aiReview.verdict === 'network_error' || aiReview.verdict === 'timeout')
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      {aiReview.verdict === 'correct' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      <div>
                        <h3 className="font-bold text-lg">
                          {aiReview.verdict === 'correct' ? 'Correct Answer' : 
                           aiReview.verdict === 'network_error' ? '⚠️ Execution Service Unavailable' :
                           aiReview.verdict === 'ai_unavailable' ? '⚠️ AI Review Unavailable' :
                           aiReview.verdict === 'compilation_error' ? 'Compilation Error' :
                           aiReview.verdict === 'runtime_error' ? 'Runtime Error' :
                           aiReview.verdict === 'timeout' ? 'Time Limit Exceeded' :
                           aiReview.verdict === 'error' ? 'Evaluation Failed' : 'Incorrect Answer'}
                        </h3>
                        <p className="text-xs opacity-80 whitespace-pre-wrap">{aiReview.summary}</p>
                        {aiReview.errorMessage && (
                          <p className="text-xs mt-1 text-amber-200 font-bold bg-amber-900/30 px-2 py-1 rounded inline-block">{aiReview.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    
                    {aiReview.verdict !== 'network_error' && aiReview.verdict !== 'error' && aiReview.verdict !== 'ai_unavailable' && (
                      <div className="space-y-4">
                        <h4 className="text-white font-bold border-b border-white/10 pb-2 flex items-center gap-2">
                          <Code className="w-4 h-4 text-indigo-400" /> {aiReview.reviewSource === 'rule_based_fallback' ? 'Rule-Based Feedback (AI Provider Temporarily Unavailable)' : 'AI Review Available'}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Time Complexity</p>
                            <p className="text-sm text-emerald-300 font-mono">{aiReview.timeComplexity}</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Space Complexity</p>
                            <p className="text-sm text-emerald-300 font-mono">{aiReview.spaceComplexity}</p>
                          </div>
                        </div>
                      
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                        <div className="flex flex-col gap-3 mb-2 border-b border-white/10 pb-4">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Logic Analysis</p>
                            <p className="text-sm text-emerald-300">{aiReview.logicAnalysis}</p>
                          </div>
                          {aiReview.codeQuality !== 'Unknown' && (
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Code Quality</p>
                            <p className="text-sm text-emerald-300">{aiReview.codeQuality}</p>
                          </div>
                          )}
                          {aiReview.edgeCaseAnalysis !== 'Unknown' && (
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Edge Cases</p>
                            <p className="text-sm text-emerald-300">{aiReview.edgeCaseAnalysis}</p>
                          </div>
                          )}
                        </div>

                        {aiReview.userApproach !== 'Unknown' && (
                        <div>
                          <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Your Approach</p>
                          <p className="text-sm text-slate-200 leading-relaxed">{aiReview.userApproach}</p>
                        </div>
                        )}
                        
                        {aiReview.expectedApproach !== 'Unknown' && (
                        <div>
                          <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Expected Approach</p>
                          <p className="text-sm text-slate-200 leading-relaxed">{aiReview.expectedApproach}</p>
                        </div>
                        )}

                        {aiReview.difference !== 'Unknown' && (
                        <div>
                          <p className="text-[10px] text-amber-400 uppercase font-bold mb-1">Difference</p>
                          <p className="text-sm text-slate-200 leading-relaxed">{aiReview.difference}</p>
                        </div>
                        )}
                        
                        {aiReview.learningTopics && aiReview.learningTopics !== 'Unknown' && (
                          <div>
                            <p className="text-[10px] text-sky-400 uppercase font-bold mb-1">Concepts to Revise & Practice</p>
                            <p className="text-sm text-slate-200 leading-relaxed">{aiReview.learningTopics}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl flex gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-indigo-300 mb-1">How To Improve</p>
                          <p className="text-sm text-indigo-100/80 leading-relaxed">{aiReview.improvementSuggestions}</p>
                        </div>
                      </div>
                    </div>
                    )}

                    {aiReview.verdict === 'correct' && aiReview.correctedCode && (
                      <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden mt-4">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-slate-950">
                          <p className="text-xs font-bold text-indigo-300 flex items-center gap-2"><Code className="w-3.5 h-3.5" /> Optimized Solution</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(aiReview.correctedCode);
                            }}
                            className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors text-slate-300"
                          >
                            <Copy className="w-3 h-3" /> Copy Code
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-emerald-300 p-3 overflow-x-auto whitespace-pre-wrap max-h-60">{aiReview.correctedCode}</pre>
                      </div>
                    )}

                    {['incorrect', 'compilation_error', 'runtime_error', 'timeout'].includes(aiReview.verdict) && (
                      <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl flex flex-col gap-4 mt-4">
                        <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-2">
                          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                          <h4 className="text-sm font-bold text-indigo-300">How To Improve</h4>
                        </div>
                        
                        {aiReview.mistakeExplanation && aiReview.mistakeExplanation !== 'Unknown' && aiReview.mistakeExplanation !== 'N/A' && (
                          <div>
                            <p className="text-[10px] text-rose-400 uppercase font-bold mb-1">What Went Wrong</p>
                            {aiReview.mistakeLocation && aiReview.mistakeLocation !== 'Unknown' && aiReview.mistakeLocation !== 'None' && (
                              <p className="text-xs text-rose-300 font-mono bg-rose-500/10 px-2 py-1 rounded inline-block mb-2">Location: {aiReview.mistakeLocation}</p>
                            )}
                            <p className="text-sm text-indigo-100/90 leading-relaxed whitespace-pre-wrap">{aiReview.mistakeExplanation}</p>
                          </div>
                        )}
                        
                        {aiReview.improvementSuggestions && aiReview.improvementSuggestions !== 'Unknown' && (
                          <div>
                            <p className="text-[10px] text-amber-400 uppercase font-bold mb-1">How To Fix It (Step-by-Step)</p>
                            <p className="text-sm text-indigo-100/90 leading-relaxed whitespace-pre-wrap">{aiReview.improvementSuggestions}</p>
                          </div>
                        )}

                        {aiReview.expectedApproach && aiReview.expectedApproach !== 'Unknown' && (
                          <div>
                            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Recommended Approach</p>
                            <p className="text-sm text-indigo-100/90 leading-relaxed whitespace-pre-wrap">{aiReview.expectedApproach}</p>
                          </div>
                        )}

                        {aiReview.learningTopics && aiReview.learningTopics !== 'Unknown' && (
                          <div>
                            <p className="text-[10px] text-sky-400 uppercase font-bold mb-1">Relevant Algorithm / Data Structure</p>
                            <p className="text-sm text-indigo-100/90 leading-relaxed whitespace-pre-wrap">{aiReview.learningTopics}</p>
                          </div>
                        )}

                        {aiReview.correctedCode && !aiReview.correctedCode.includes('A trusted reference solution is currently unavailable') ? (
                          <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl overflow-hidden mt-2">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-500/30 bg-slate-950">
                              <p className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                                <Code className="w-3.5 h-3.5" /> 
                                {aiReview.correctedCode.includes('Could not be verified') || aiReview.correctedCode.includes('Fails validation') ? 'Unverified Suggested Approach' : 'Corrected Solution'}
                              </p>
                              <button
                                onClick={() => navigator.clipboard.writeText(aiReview.correctedCode)}
                                className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors text-slate-300"
                              >
                                <Copy className="w-3 h-3" /> Copy Code
                              </button>
                            </div>
                            <pre className="text-xs font-mono text-emerald-300 p-3 overflow-x-auto whitespace-pre-wrap max-h-60">{aiReview.correctedCode}</pre>
                            {aiReview.timeComplexity && aiReview.timeComplexity !== 'Unknown' && (
                              <div className="flex items-center gap-4 px-3 py-2 bg-slate-950 border-t border-indigo-500/30 text-[10px] text-slate-400">
                                <span><strong className="text-slate-300">Time:</strong> {aiReview.timeComplexity}</span>
                                <span><strong className="text-slate-300">Space:</strong> {aiReview.spaceComplexity}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 mt-2 text-xs text-slate-400 italic text-center">
                            A validated reference solution is currently unavailable for this problem.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 space-y-3 text-center">
                    <MessageSquare className="w-10 h-10 text-slate-600" />
                    <p className="text-sm text-slate-400">Submit your code to receive an independent AI code review.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completed' && (() => {
              const solvedList = progressData?.solvedList || [];
              const totalProblems = problems.length;
              const completedCount = solvedList.length;
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);

              const solvedTodaySet = new Set();
              const recentAttempts = progressData?.recentSolvedAttempts || [];
              recentAttempts.forEach(attempt => {
                if (new Date(attempt.solvedAt) >= todayStart) {
                  solvedTodaySet.add(attempt.problemId);
                }
              });
              
              // Ensure consistency with the rendered completed list below
              solvedList.forEach(s => {
                if (new Date(s.solvedAt) >= todayStart) {
                  solvedTodaySet.add(s.problemId || s.id);
                }
              });

              const solvedToday = solvedTodaySet.size;
              const goal = 20;
              const remainingCount = Math.max(0, goal - solvedToday);
              const extraCount = Math.max(0, solvedToday - goal);
              const pct = Math.min(100, Math.round((solvedToday / goal) * 100));

              let statusText = "Let's get started!";
              if (solvedToday >= goal) statusText = "Daily goal completed! 🚀";
              else if (solvedToday >= 11) statusText = "Almost there! Keep pushing.";
              else if (solvedToday >= 6) statusText = "Good progress! Keep going.";

              const uniqueCompletedTopics = ['All', ...new Set(solvedList.map(s => s.topic).filter(Boolean))];

              const filteredSolved = solvedList.filter(s => {
                if (completedFilterDiff !== 'All' && s.difficulty !== completedFilterDiff) return false;
                if (completedFilterTopic !== 'All' && s.topic !== completedFilterTopic) return false;
                return true;
              });

              return (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* Daily Coding Task Dashboard */}
                  <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Target className="w-32 h-32 text-indigo-400" />
                    </div>
                    
                    {solvedToday >= goal ? (
                      <div className="mb-6 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <h3 className="text-xl font-bold text-white">Daily Goal Completed!</h3>
                        </div>
                        <p className="text-sm text-slate-300">You solved {solvedToday} questions today.</p>
                      </div>
                    ) : (
                      <div className="mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          <Target className="w-5 h-5 text-indigo-400" /> Daily Coding Task
                        </h3>
                        <p className="text-sm text-slate-400">{statusText}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <p className="text-3xl font-bold text-white">{goal}</p>
                        <p className="text-[10px] text-slate-400 uppercase mt-1">Today's Goal</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                        <p className="text-3xl font-bold text-emerald-300">{solvedToday}</p>
                        <p className="text-[10px] text-emerald-400/80 uppercase mt-1">Solved Today</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <p className={`text-3xl font-bold ${extraCount > 0 ? 'text-indigo-300' : 'text-amber-300'}`}>
                          {extraCount > 0 ? `+${extraCount}` : remainingCount}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase mt-1">{extraCount > 0 ? 'Extra Questions' : 'Remaining'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 relative z-10">
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                        <span>Progress</span>
                        <span className={solvedToday >= goal ? "text-emerald-400" : ""}>{pct}%</span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between relative z-10">
                      <p className="text-xs text-slate-400">
                        {solvedToday >= goal 
                          ? "You can continue practicing more questions."
                          : `Solve ${remainingCount} more questions to complete today's coding goal.`}
                      </p>
                      <button 
                        onClick={() => setActiveTab('problem')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        Practice Now <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filters */}
                  {completedCount > 0 && (
                    <div className="flex gap-2">
                      <select
                        value={completedFilterDiff}
                        onChange={e => setCompletedFilterDiff(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
                      >
                        <option value="All">All Difficulties</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                      <select
                        value={completedFilterTopic}
                        onChange={e => setCompletedFilterTopic(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
                      >
                        {uniqueCompletedTopics.map(t => (
                          <option key={t} value={t}>{t === 'All' ? 'All Topics' : t}</option>
                        ))}
                      </select>
                      {(completedFilterDiff !== 'All' || completedFilterTopic !== 'All') && (
                        <button
                          onClick={() => { setCompletedFilterDiff('All'); setCompletedFilterTopic('All'); }}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs text-white transition-colors"
                        >Clear</button>
                      )}
                    </div>
                  )}

                  {/* Solved List */}
                  {completedCount === 0 ? (
                    <div className="bg-white/5 p-8 rounded-xl border border-white/10 text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400">No problems solved yet.</p>
                      <button
                        onClick={() => setActiveTab('problem')}
                        className="text-xs font-bold text-indigo-400 hover:underline"
                      >Go to Problems List</button>
                    </div>
                  ) : filteredSolved.length === 0 ? (
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                      <p className="text-sm text-slate-400">No solved problems match the current filters.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSolved.map(p => {
                        const liveProb = problems.find(cp => cp.id === p.problemId);
                        return (
                          <div key={p.problemId} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-start justify-between gap-3 group">
                            <div className="flex-1 min-w-0">
                              {liveProb ? (
                                <button
                                  onClick={() => { setActiveProblem(liveProb); setActiveTab('problem'); setAiReview(null); }}
                                  className="font-bold text-white text-xs hover:text-indigo-400 transition-colors text-left truncate w-full"
                                  title={p.title}
                                >
                                  {p.title}
                                </button>
                              ) : (
                                <p className="font-bold text-slate-500 text-xs truncate" title={p.title}>{p.title} <span className="text-rose-400">(unavailable)</span></p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getDifficultyColor(p.difficulty)}`}>{p.difficulty}</span>
                                {p.topic && <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{p.topic}</span>}
                                <span className="text-[10px] text-slate-400">{p.language}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(p.solvedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              {liveProb && (
                                <button
                                  onClick={() => { setActiveProblem(liveProb); setActiveTab('problem'); setAiReview(null); }}
                                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >View</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => { setShowProblemList(true); }}
                    className="w-full py-2.5 text-xs font-bold text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
                  >
                    ← Back to Problems List
                  </button>
                </div>
              );
            })()}

            {activeTab === 'progress' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                    <p className="text-2xl font-bold text-white">{progressData?.totalSolved || 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-1">Unique Solved</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                    <p className="text-2xl font-bold text-white">{progressData?.totalAttempted || 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-1">Attempted</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                    <p className="text-2xl font-bold text-white">{progressData?.totalSubmissions || 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-1">Submissions</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h4 className="text-xs font-bold text-white mb-3">By Difficulty</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-emerald-400">Easy</span>
                        <span className="text-white font-bold">{progressData?.solvedByDifficulty?.Easy || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-amber-400">Medium</span>
                        <span className="text-white font-bold">{progressData?.solvedByDifficulty?.Medium || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-rose-400">Hard</span>
                        <span className="text-white font-bold">{progressData?.solvedByDifficulty?.Hard || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h4 className="text-xs font-bold text-white mb-3">By Language</h4>
                    {Object.keys(progressData?.solvedByLanguage || {}).length === 0 ? (
                      <p className="text-xs text-slate-500">No data</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(progressData.solvedByLanguage).map(([lang, count]) => (
                          <div key={lang} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300">{lang}</span>
                            <span className="text-white font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h4 className="text-xs font-bold text-white mb-3">By Topic</h4>
                  {Object.keys(progressData?.solvedByTopic || {}).length === 0 ? (
                    <p className="text-xs text-slate-500">No data</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(progressData.solvedByTopic).map(([topic, count]) => (
                        <div key={topic} className="px-2 py-1 bg-black/40 rounded-lg border border-white/5 text-[10px] text-slate-300 flex items-center gap-2">
                          <span>{topic}</span>
                          <span className="font-bold text-white">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-white font-bold text-sm">Solved Problems</h4>
                  {(!progressData?.solvedList || progressData.solvedList.length === 0) ? (
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                      <p className="text-sm text-slate-500">You haven't solved any problems yet.</p>
                      <button onClick={() => setActiveTab('problem')} className="mt-2 text-xs font-bold text-indigo-400 hover:underline">
                        Start your first challenge
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {progressData.solvedList.map(p => (
                        <div key={p.problemId} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between group">
                          <div>
                            <button onClick={() => { 
                              const prob = problems.find(cp => cp.id === p.problemId);
                              if (prob) {
                                setActiveProblem(prob);
                                setActiveTab('problem');
                              }
                            }} className="font-bold text-white text-xs hover:text-indigo-400 transition-colors text-left">
                              {p.title}
                            </button>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getDifficultyColor(p.difficulty)}`}>{p.difficulty}</span>
                              <span className="text-[10px] text-slate-400">{p.language}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(p.solvedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor */}
        <div className="min-h-0 flex flex-col">
          <CodeEditor 
            key={activeProblem.id} 
            initialCode="" 
            starterCodeMap={activeProblem.starterCode}
            testCases={activeProblem.testCases}
            problemId={activeProblem.id}
            problemTitle={activeProblem.title}
            onSubmit={handleCodeSubmit}
            isSubmitting={isSubmitting}
            initialLanguage={user?.preferredCodingLanguage || 'Python'}
          />
        </div>
      </div>
    </div>
  );
}
