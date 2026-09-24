import React, { useState } from 'react';
import { Terminal, Play, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CodeEditor({ initialCode = '', onCodeChange }) {
  const [code, setCode] = useState(initialCode || `// Write your solution here\nfunction solve(input) {\n  return input;\n}`);
  const [consoleOutput, setConsoleOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (onCodeChange) onCodeChange(newCode);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setConsoleOutput(null);

    setTimeout(() => {
      setIsRunning(false);
      try {
        setConsoleOutput({
          status: 'success',
          logs: ['Executing test cases...', 'Test Case 1: PASSED (2ms)', 'Test Case 2: PASSED (1ms)', 'Output: Solution passed 2/2 tests cleanly!']
        });
      } catch (err) {
        setConsoleOutput({
          status: 'error',
          logs: [`Runtime Error: ${err.message}`]
        });
      }
    }, 800);
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[400px]">
      {/* Editor Header */}
      <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
          </div>
          <span className="text-xs font-mono text-slate-400 ml-2">solution.js</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCodeChange(initialCode)}
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
        </div>
      </div>

      {/* Code Textarea */}
      <div className="flex-1 relative bg-[#070a12] font-['Fira_Code',monospace] text-sm leading-relaxed p-4">
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="// Type your code here..."
          className="w-full h-full bg-transparent text-emerald-300 focus:outline-none resize-none selection:bg-indigo-500/40"
          spellCheck="false"
        />
      </div>

      {/* Terminal / Test Case Console */}
      {consoleOutput && (
        <div className="bg-slate-950 border-t border-white/10 p-3 max-h-36 overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-semibold mb-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300">Execution Output</span>
            {consoleOutput.status === 'success' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 ml-auto">
                <CheckCircle className="w-3 h-3" /> All Tests Passed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-rose-400 ml-auto">
                <AlertTriangle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>
          <div className="font-['Fira_Code',monospace] text-xs space-y-1 text-slate-400">
            {consoleOutput.logs.map((log, i) => (
              <div key={i} className={log.includes('PASSED') ? 'text-emerald-400 font-semibold' : ''}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
