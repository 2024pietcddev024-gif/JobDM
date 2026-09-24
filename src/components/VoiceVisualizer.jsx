import React from 'react';
import { Mic, Volume2 } from 'lucide-react';

export default function VoiceVisualizer({ isSpeaking, isListening, speakerName = 'AI Interviewer' }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl glass-card border border-white/10">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isSpeaking ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse' :
          isListening ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' :
          'bg-slate-800 text-slate-400'
        }`}>
          {isSpeaking ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </div>
        <div>
          <span className="text-xs font-bold text-white block">{speakerName}</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {isSpeaking ? 'Speaking Question...' : isListening ? 'Listening to Answer...' : 'Voice Ready'}
          </span>
        </div>
      </div>

      {/* Dynamic Animated Bars */}
      {(isSpeaking || isListening) && (
        <div className="flex items-center gap-1 h-6 ml-auto pl-4 border-l border-white/10">
          <span className={`w-1 rounded-full ${isSpeaking ? 'bg-indigo-500 animate-wave-1' : 'bg-rose-500 animate-wave-1'}`}></span>
          <span className={`w-1 rounded-full ${isSpeaking ? 'bg-indigo-400 animate-wave-2' : 'bg-rose-400 animate-wave-2'}`}></span>
          <span className={`w-1 rounded-full ${isSpeaking ? 'bg-purple-500 animate-wave-3' : 'bg-rose-500 animate-wave-3'}`}></span>
          <span className={`w-1 rounded-full ${isSpeaking ? 'bg-indigo-500 animate-wave-4' : 'bg-rose-400 animate-wave-4'}`}></span>
          <span className={`w-1 rounded-full ${isSpeaking ? 'bg-indigo-300 animate-wave-5' : 'bg-rose-300 animate-wave-5'}`}></span>
        </div>
      )}
    </div>
  );
}
