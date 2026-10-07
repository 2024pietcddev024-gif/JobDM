import React, { useState, useEffect } from 'react';
import { Terminal, Play, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const LANGUAGE_TEMPLATES = {
  Python: 'def solve(input):\n    # Write your solution here\n    pass',
  Java: 'class Solution {\n    public Object solve(Object input) {\n        // Write your solution here\n        return input;\n    }\n}',
  'C++': 'class Solution {\npublic:\n    int solve(int input) {\n        // Write your solution here\n        return input;\n    }\n};',
  // JavaScript: 'function solve(input) {\n  // Write your solution here\n  return input;\n}',
  // TypeScript: 'function solve(input: any): any {\n  // Write your solution here\n  return input;\n}',
  // Go: 'package main\n\nfunc solve() {\n    // Write your solution here\n}',
  // Rust: 'fn solve() {\n    // Write your solution here\n}',
  // 'C#': 'public class Solution {\n    public object Solve(object input) {\n        // Write your solution here\n        return input;\n    }\n}',
  // Kotlin: 'class Solution {\n    fun solve(input: Any): Any {\n        // Write your solution here\n        return input\n    }\n}',
  // PHP: 'class Solution {\n    function solve($input) {\n        // Write your solution here\n        return $input;\n    }\n}',
  // Swift: 'class Solution {\n    func solve(_ input: Any) -> Any {\n        // Write your solution here\n        return input\n    }\n}'
};

export default function CodeEditor({ initialCode = '', onCodeChange, initialLanguage = 'Python', onSubmit, starterCodeMap, problemId, testCases = [], problemTitle = '', isSubmitting = false }) {
  const [language, setLanguage] = useState(initialLanguage);
  
  // Choose the right template: starterCodeMap if provided, otherwise the global LANGUAGE_TEMPLATES, otherwise initialCode
  const getTemplate = (lang) => (starterCodeMap && starterCodeMap[lang]) || LANGUAGE_TEMPLATES[lang] || initialCode || '// Write your code here';
  
  const getExtension = (lang) => {
    switch (lang) {
      case 'Python': return python();
      case 'Java': return java();
      case 'C++': return cpp();
      default: return python();
    }
  };

  const [code, setCode] = useState(getTemplate(initialLanguage));
  const [consoleOutput, setConsoleOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setCode(getTemplate(language));
  }, [initialCode, starterCodeMap, language]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (onCodeChange) onCodeChange(newCode);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setConsoleOutput(null);

    const token = localStorage.getItem('interviewiq_token');
    try {
      const res = await fetch(`${API_URL}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language, code, problemId })
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Execution failed');
      } else {
        const text = await res.text();
        if (res.status === 401) {
          throw new Error('Unauthorized: Please log in to run code.');
        } else if (res.status === 403) {
          throw new Error('Forbidden: Your session may have expired. Please log in again.');
        } else {
          throw new Error(text || `Server returned error ${res.status}`);
        }
      }
      
      setConsoleOutput(data);
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
      setConsoleOutput({
        status: isNetworkError ? 'network_error' : 'error',
        compileError: null,
        runtimeError: isNetworkError ? 'Unable to connect to the code execution service. Please try again.' : err.message,
        results: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const template = getTemplate(newLang);
    setCode(template);
    if (onCodeChange) onCodeChange(template);
  };

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Editor Header */}
      <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
          </div>
          <select 
            value={language}
            onChange={handleLanguageChange}
            className="ml-4 bg-slate-800 text-slate-300 text-xs font-semibold px-2 py-1 rounded outline-none border border-white/10"
          >
            {Object.keys(LANGUAGE_TEMPLATES).map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCodeChange(getTemplate(language))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1"
            title="Reset Starter Code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>
          
          {onSubmit && (
            <button
              onClick={() => onSubmit(language, code)}
              disabled={isSubmitting || isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 ${(isSubmitting || isRunning) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Answer'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative text-sm leading-relaxed overflow-hidden bg-[#1e1e1e]">
        <CodeMirror
          value={code}
          height="100%"
          theme={vscodeDark}
          extensions={[getExtension(language)]}
          onChange={(value) => handleCodeChange(value)}
          className="h-full w-full outline-none"
        />
      </div>

      {/* Terminal / Test Case Console */}
      {consoleOutput && (
        <div className="bg-[#111] border-t border-white/10 p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
          <div className="flex items-center gap-2 text-sm font-bold mb-3">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-200">Execution Output</span>
            
            {consoleOutput.status === 'success' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 ml-auto bg-emerald-500/10 px-2 py-1 rounded">
                <CheckCircle className="w-3.5 h-3.5" /> All Tests Passed ({consoleOutput.passedCount} / {consoleOutput.totalCount})
              </span>
            )}
            
            {consoleOutput.status === 'wrong_answer' && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 ml-auto bg-amber-500/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" /> Incorrect Answer ({consoleOutput.passedCount} / {consoleOutput.totalCount} passed)
              </span>
            )}

            {consoleOutput.status === 'compilation_error' && (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 ml-auto bg-rose-500/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" /> Compilation Error
              </span>
            )}

            {consoleOutput.status === 'runtime_error' && (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 ml-auto bg-rose-500/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" /> Runtime Error
              </span>
            )}

            {consoleOutput.status === 'network_error' && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 ml-auto bg-amber-500/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" /> Execution Service Unavailable
              </span>
            )}

            {consoleOutput.status === 'incomplete' && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 ml-auto bg-amber-500/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" /> Incomplete Code
              </span>
            )}
          </div>

          <div className="space-y-4">
            {consoleOutput.status === 'incomplete' && (
              <div className="text-xs text-amber-300 font-mono bg-amber-950/30 p-3 rounded-lg border border-amber-500/20">
                {consoleOutput.error || 'Please implement the solution before running the test cases.'}
              </div>
            )}

            {consoleOutput.compileError && (
              <div className="text-xs text-rose-300 font-mono bg-rose-950/30 p-3 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                {consoleOutput.compileError}
              </div>
            )}

            {consoleOutput.runtimeError && (
              <div className="text-xs text-rose-300 font-mono bg-rose-950/30 p-3 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                {consoleOutput.runtimeError}
              </div>
            )}

            {consoleOutput.results?.length > 0 && (
              <div className="space-y-3">
                {consoleOutput.results.map((res, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${res.passed ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-rose-950/20 border-rose-500/20'}`}>
                    <p className={`text-xs font-bold mb-2 flex items-center gap-2 ${res.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {res.passed ? '✅ Passed' : '❌ Failed'} - Test Case {res.testCaseIndex || i + 1}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-500">Input:</span>
                        <div className="text-slate-300 mt-1 whitespace-pre-wrap bg-black/40 p-1.5 rounded">{res.input || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Expected:</span>
                        <div className="text-slate-300 mt-1 whitespace-pre-wrap bg-black/40 p-1.5 rounded">{res.expectedOutput || res.expected || 'N/A'}</div>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-slate-500">Actual Output:</span>
                        <div className={`mt-1 whitespace-pre-wrap bg-black/40 p-1.5 rounded ${res.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {res.actualOutput || res.actual || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
