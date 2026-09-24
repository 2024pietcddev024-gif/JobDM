import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { speechManager } from '../services/speechService';
import { analyzeTranscriptMetrics } from '../services/metricsEngine';
import VoiceVisualizer from '../components/VoiceVisualizer';
import EmotionTracker from '../components/EmotionTracker';
import CodeEditor from '../components/CodeEditor';
import { 
  Mic, MicOff, Send, Volume2, VolumeX, Clock, Sparkles, 
  ShieldCheck, Bot, User, LogOut, SkipForward, AlertTriangle,
  CheckCircle, Loader2
} from 'lucide-react';

export default function InterviewSession({ onNavigate }) {
  const { user } = useAuth();
  const { 
    activeSession, currentQuestion, isLoadingQuestion, isEvaluating,
    submitCurrentAnswer, skipCurrentQuestion, exitInterview,
    questionIndex, interviewError, interviewComplete, finalReport
  } = useInterview();

  const [answerText, setAnswerText] = useState('');
  const [speechError, setSpeechError] = useState(null);
  const [codeAnswer, setCodeAnswer] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [speechMetrics, setSpeechMetrics] = useState({ wordCount: 0, wpm: 0, fillerCount: 0 });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const timerSecondsRef = useRef(0);
  const hasNavigatedToReport = useRef(false);

  // ─── Navigate to report when complete ────────────────────────────────────
  useEffect(() => {
    if (interviewComplete && finalReport && !hasNavigatedToReport.current) {
      hasNavigatedToReport.current = true;
      speechManager.stopListening();
      speechManager.stopSpeaking();
      setIsMicOn(false);
      setTimeout(() => onNavigate('report'), 300);
    }
  }, [interviewComplete, finalReport, onNavigate]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSeconds(prev => {
        timerSecondsRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Tab change detection ─────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeSession) {
        setTabWarning(true);
        setTabWarningCount(prev => prev + 1);
        speechManager.stopListening();
        setIsMicOn(false);
        // Auto-dismiss after 5 seconds
        setTimeout(() => setTabWarning(false), 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeSession]);

  // ─── TTS: speak question ──────────────────────────────────────────────────
  useEffect(() => {
    if (currentQuestion) {
      setAnswerText('');
      setCodeAnswer(currentQuestion?.codingPrompt || '');
      setSubmitSuccess(false);
      setSpeechError(null);

      if (currentQuestion.question && !isTtsMuted) {
        setIsTtsSpeaking(true);
        speechManager.speakText(currentQuestion.question, () => setIsTtsSpeaking(false));
      }
    }
  }, [currentQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isTtsMuted && currentQuestion?.question) {
      setIsTtsSpeaking(true);
      speechManager.speakText(currentQuestion.question, () => setIsTtsSpeaking(false));
    } else if (isTtsMuted) {
      speechManager.stopSpeaking();
      setIsTtsSpeaking(false);
    }
  }, [isTtsMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Speech recognition ───────────────────────────────────────────────────
  useEffect(() => {
    if (isMicOn) {
      speechManager.onError = (err) => {
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setSpeechError('Microphone access denied. Click the 🔒 icon in your browser address bar and allow microphone access, then try again.');
          setIsMicOn(false);
        } else if (err === 'not-supported') {
          setSpeechError('Speech recognition requires Chrome or Microsoft Edge. Please switch browser or type your answer.');
          setIsMicOn(false);
        } else {
          setSpeechError(`Speech error (${err}). Toggle mic off and on to retry.`);
        }
      };
      speechManager.onStateChange = (listening) => {
        if (!listening) setIsMicOn(false);
      };
      speechManager.startListening((liveText) => {
        setAnswerText(liveText);
        setSpeechError(null);
        setSpeechMetrics(analyzeTranscriptMetrics(liveText, timerSecondsRef.current));
      });
    } else {
      speechManager.stopListening();
    }
    return () => {
      speechManager.onError = null;
      speechManager.onStateChange = null;
      speechManager.stopListening();
    };
  }, [isMicOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      speechManager.stopListening();
      speechManager.stopSpeaking();
    };
  }, []);

  const handleSubmitAnswer = async () => {
    speechManager.stopListening();
    setIsMicOn(false);
    speechManager.stopSpeaking();
    setSubmitSuccess(false);

    await submitCurrentAnswer({
      answerText,
      codeContent: codeAnswer,
      metrics: speechMetrics
    });
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 2000);
  };

  const handleExit = async () => {
    speechManager.stopListening();
    speechManager.stopSpeaking();
    await exitInterview();
    setShowExitConfirm(false);
  };

  const handleSkip = async () => {
    speechManager.stopListening();
    setIsMicOn(false);
    await skipCurrentQuestion();
  };

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const total = activeSession?.totalQuestions || 10;
  const progressPct = Math.round((questionIndex / total) * 100);

  if (!activeSession) {
    return (
      <div className="text-center py-20 space-y-4">
        {interviewError && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {interviewError}
          </div>
        )}
        <p className="text-slate-400">No active interview session.</p>
        <button onClick={() => onNavigate('new-interview')} className="px-6 py-2.5 rounded-xl glow-btn text-white font-bold text-sm">
          Start New Interview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* ─── Tab Switch Warning Banner ──────────────────────────────────────── */}
      {tabWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-rose-900/90 border border-rose-500/50 shadow-2xl backdrop-blur-md">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">⚠️ Tab Switch Detected!</p>
              <p className="text-xs text-rose-300">Switching tabs during an interview is flagged. Warning #{tabWarningCount}. Mic has been stopped.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Exit Confirmation Dialog ───────────────────────────────────────── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl max-w-sm w-full mx-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Exit Interview?</h3>
                <p className="text-xs text-slate-400">Your progress so far will be saved.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              You've answered <strong className="text-white">{questionIndex}</strong> of <strong className="text-white">{total}</strong> questions.
              Exiting now will generate a partial report.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold border border-white/10 transition-colors">
                Continue Interview
              </button>
              <button onClick={handleExit} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors">
                Exit & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top Session Bar ────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-base font-['Outfit']">{activeSession.role || activeSession.category}</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{activeSession.difficulty}</span>
            </div>
            <p className="text-xs text-slate-400">Question {questionIndex + 1} of {total}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:flex flex-1 max-w-xs flex-col gap-1">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Progress</span><span>{questionIndex}/{total}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VoiceVisualizer isSpeaking={isTtsSpeaking} isListening={isMicOn} />

          <button onClick={() => { if (isTtsSpeaking) speechManager.stopSpeaking(); setIsTtsMuted(!isTtsMuted); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10" title={isTtsMuted ? 'Unmute AI' : 'Mute AI'}>
            {isTtsMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-mono font-bold">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{timeFormatted}</span>
          </div>

          {/* Skip Question */}
          <button onClick={handleSkip} disabled={isLoadingQuestion || isEvaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition-colors disabled:opacity-50"
            title="Skip this question">
            <SkipForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Skip</span>
          </button>

          {/* Exit Interview */}
          <button onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
            title="Exit interview">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* ─── Main Cockpit ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Question + Answer */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Question Card */}
          <div className="glass-card rounded-3xl p-6 lg:p-8 border border-indigo-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5" /> AI Interviewer Question
              </span>
              {currentQuestion?.topics && (
                <div className="flex flex-wrap gap-1.5">
                  {currentQuestion.topics.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {isLoadingQuestion || isEvaluating ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">
                  {isEvaluating ? 'Evaluating your answer...' : 'AI is generating next question...'}
                </p>
              </div>
            ) : (
              <h3 className="text-lg lg:text-xl font-semibold text-white leading-relaxed font-['Outfit']">
                "{currentQuestion?.question}"
              </h3>
            )}
          </div>

          {/* Code Editor */}
          {(currentQuestion?.type === 'coding' || activeSession.mode === 'coding') && (
            <CodeEditor initialCode={currentQuestion?.codingPrompt} onCodeChange={(c) => setCodeAnswer(c)} />
          )}

          {/* Answer Area */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">Your Response</h4>
              </div>
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                disabled={isLoadingQuestion || isEvaluating}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                  isMicOn
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                    : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30'
                }`}>
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{isMicOn ? 'Recording... (Click to Stop)' : 'Click to Speak'}</span>
              </button>
            </div>

            {speechError && (
              <div className="text-rose-400 text-xs bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{speechError}</span>
              </div>
            )}

            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={isMicOn ? 'Listening to your spoken answer... speak clearly.' : 'Click "Click to Speak" for voice input, or type your answer here...'}
              className="w-full h-32 p-4 rounded-2xl glass-input text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
              <div className="flex items-center gap-4">
                <span>WPM: <strong className="text-indigo-300">{speechMetrics.wpm || 0}</strong></span>
                <span>Words: <strong className="text-indigo-300">{speechMetrics.wordCount || 0}</strong></span>
                <span className={speechMetrics.fillerCount > 3 ? 'text-rose-400 font-bold' : ''}>
                  Fillers: <strong className="text-amber-400">{speechMetrics.fillerCount || 0}</strong>
                </span>
              </div>
              {submitSuccess && (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" /> Answer saved!
                </span>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitAnswer}
                disabled={isEvaluating || isLoadingQuestion}
                className="flex items-center gap-2 px-6 py-3 rounded-xl glow-btn text-white font-extrabold text-sm shadow-xl disabled:opacity-50">
                {isEvaluating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                  : <><Send className="w-4 h-4" /> Submit Answer</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Right — Webcam + Tips */}
        <div className="space-y-4">
          <EmotionTracker isWebcamActive={isWebcamActive} setIsWebcamActive={setIsWebcamActive} fillerCount={speechMetrics.fillerCount} />

          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" /> Interview Best Practices
            </div>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2"><span className="text-indigo-400">•</span><span>Use the <strong>STAR method</strong> for behavioral questions.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-400">•</span><span>Speak at <strong>120–140 WPM</strong> — not too fast, not too slow.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-400">•</span><span>Mention <strong>specific numbers or outcomes</strong> when possible.</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-400">•</span><span>Don't leave answers blank — a partial answer shows thought process.</span></li>
            </ul>
          </div>

          {tabWarningCount > 0 && (
            <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-500/30">
              <p className="text-xs text-rose-400 font-semibold">⚠️ {tabWarningCount} tab switch{tabWarningCount > 1 ? 'es' : ''} detected this session.</p>
              <p className="text-xs text-slate-500 mt-0.5">Tab switching is noted in your report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
