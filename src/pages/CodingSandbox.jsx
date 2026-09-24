import React, { useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { Terminal, Code, Sparkles, CheckCircle2, Play } from 'lucide-react';

export default function CodingSandbox() {
  const problems = [
    {
      id: 'p1',
      title: 'Design a Sliding Window Rate Limiter',
      difficulty: 'Medium',
      category: 'Backend Architecture',
      description: 'Implement a RateLimiter class in JavaScript that restricts an IP address to at most X requests within a window of T milliseconds.',
      initialCode: `class RateLimiter {
  constructor(limit = 5, windowMs = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = new Map(); // ip -> Array of timestamps
  }

  isAllowed(ip) {
    const now = Date.now();
    if (!this.requests.has(ip)) {
      this.requests.set(ip, [now]);
      return true;
    }
    
    // Filter timestamps within sliding window
    const timestamps = this.requests.get(ip).filter(ts => now - ts < this.windowMs);
    if (timestamps.length < this.limit) {
      timestamps.push(now);
      this.requests.set(ip, timestamps);
      return true;
    }

    return false;
  }
}`
    },
    {
      id: 'p2',
      title: 'Implement Custom React useDebounce Hook',
      difficulty: 'Easy',
      category: 'Frontend Engineering',
      description: 'Write a React custom hook `useDebounce` that accepts a target value and delay milliseconds, returning the debounced value.',
      initialCode: `import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}`
    }
  ];

  const [activeProblem, setActiveProblem] = useState(problems[0]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white font-['Outfit']">
            Technical Coding Practice Room
          </h1>
          <p className="text-xs text-slate-400">Interactive live code sandbox & automated test suite</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Problem Picker & Description */}
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <h3 className="font-extrabold text-lg text-white font-['Outfit']">Select Challenge</h3>
            <div className="space-y-2">
              {problems.map((prob) => (
                <div
                  key={prob.id}
                  onClick={() => setActiveProblem(prob)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    activeProblem.id === prob.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs">{prob.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10">{prob.difficulty}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{prob.category}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
              <Code className="w-3.5 h-3.5" /> Problem Prompt
            </span>
            <h3 className="font-extrabold text-base text-white font-['Outfit']">{activeProblem.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{activeProblem.description}</p>
          </div>
        </div>

        {/* Right Column: Code Editor Workspace */}
        <div className="lg:col-span-2 space-y-4">
          <CodeEditor initialCode={activeProblem.initialCode} />
        </div>
      </div>
    </div>
  );
}
