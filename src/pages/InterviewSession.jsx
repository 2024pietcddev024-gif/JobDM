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
    questionIndex, interviewError, interviewComplete, finalReport,
    isTerminated, terminationReason, tabSwitchCount, clipboardViolationCount,
    proctoringViolationCount,
    reportViolation
  } = useInterview();

  const [answerText, setAnswerText] = useState('');
  const [speechError, setSpeechError] = useState(null);
  const [codeAnswer, setCodeAnswer] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [speechMetrics, setSpeechMetrics] = useState({ wordCount: 0, wpm: 0, fillerCount: 0 });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Anti-cheating Modal States
  const [warningModal, setWarningModal] = useState({ show: false, message: '', type: '' });
  const [terminationModal, setTerminationModal] = useState({ show: false, message: '', type: '' });

  const timerSecondsRef = useRef(0);
  const answerTextRef = useRef('');
  const hasNavigatedToReport = useRef(false);
  const lastTabEventRef = useRef(0);
  const lastClipboardEventRef = useRef(0);

  const isInsecureNetworkOrigin = typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  useEffect(() => {
    answerTextRef.current = answerText;
  }, [answerText]);

  // ─── Navigate to report when naturally complete (not on termination) ────────
  useEffect(() => {
    if (interviewComplete && finalReport && !isTerminated && !hasNavigatedToReport.current) {
      hasNavigatedToReport.current = true;
      speechManager.stopListening();
      speechManager.stopSpeaking();
      setIsMicOn(false);
      setTimeout(() => onNavigate('report'), 300);
    }
  }, [interviewComplete, finalReport, isTerminated, onNavigate]);

  // ─── If resumed or marked terminated, ensure modals are shown ─────────────
  useEffect(() => {
    if (isTerminated) {
      speechManager.stopListening();
      speechManager.stopSpeaking();
      setIsMicOn(false);
      setTerminationModal(prev => ({
        show: true,
        message: prev.message || terminationReason || 'Session terminated because the policy violation limit was reached.',
        type: prev.type || 'POLICY_VIOLATION'
      }));
    }
  }, [isTerminated, terminationReason]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isTerminated) return;
    const timer = setInterval(() => {
      setTimerSeconds(prev => {
        timerSecondsRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTerminated]);

  // ─── Anti-Cheating: Tab Switch & Window Focus Loss ────────────────────────
  useEffect(() => {
    const handleFocusLoss = async () => {
      if (!activeSession || interviewComplete || isTerminated) return;
      
      // Deduplicate rapid focus/blur/visibilitychange events within 1.5 seconds
      const now = Date.now();
      if (now - lastTabEventRef.current < 1500) return;
      lastTabEventRef.current = now;

      speechManager.stopListening();
      speechManager.stopSpeaking();
      setIsMicOn(false);

      if (reportViolation) {
        const res = await reportViolation('TAB_SWITCH');
        if (res?.terminated) {
          setTerminationModal({
            show: true,
            type: 'TAB_SWITCH',
            message: res.message || 'Session terminated because the tab-switch violation limit was reached.'
          });
        } else if (res?.warning) {
          setWarningModal({
            show: true,
            type: 'TAB_SWITCH',
            message: res.message || 'Warning 1 of 2: You left your active session. Switching tabs or leaving the session repeatedly may terminate your interview or coding practice.'
          });
        }
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    const handleBlur = () => {
      handleFocusLoss();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeSession, interviewComplete, isTerminated, reportViolation]);

  // ─── Anti-Cheating: Clipboard Violations on Textarea / Editor ─────────────
  const handleClipboardViolation = useCallback(async (e) => {
    if (isTerminated || interviewComplete || !activeSession) return;
    if (e && e.preventDefault) e.preventDefault();

    const now = Date.now();
    if (now - lastClipboardEventRef.current < 1500) return;
    lastClipboardEventRef.current = now;

    if (reportViolation) {
      const res = await reportViolation('CLIPBOARD_ACTION', { action: e?.type || 'paste' });
      if (res?.terminated) {
        speechManager.stopListening();
        speechManager.stopSpeaking();
        setIsMicOn(false);
        setTerminationModal({
          show: true,
          type: 'CLIPBOARD_ACTION',
          message: res.message || 'Session terminated because the prohibited clipboard action limit was reached.'
        });
      } else if (res?.warning) {
        setWarningModal({
          show: true,
          type: 'CLIPBOARD_ACTION',
          message: res.message || 'Warning 1 of 2: Copying, cutting, or pasting code is not allowed during this interview session. Repeated violations will end the session.'
        });
      }
    }
  }, [isTerminated, interviewComplete, activeSession, reportViolation]);

  const handleTextareaKeyDown = (e) => {
    // Intercept keyboard shortcuts for copy, cut, paste (Ctrl/Cmd + C, V, X)
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
      handleClipboardViolation(e);
    }
  };

  // ─── Anti-Cheating: Real-Time Proctoring (Face, Voice, Gaze) ─────────────
  const handleProctoringViolation = useCallback(async (violationType, details = {}) => {
    if (isTerminated || interviewComplete || !activeSession) return;

    if (reportViolation) {
      const res = await reportViolation(violationType, details);
      if (res?.terminated) {
        speechManager.stopListening();
        speechManager.stopSpeaking();
        setIsMicOn(false);
        setTerminationModal({
          show: true,
          type: violationType,
          message: res.message || 'Session terminated due to proctoring security violations.'
        });
      } else if (res?.warning) {
        setWarningModal({
          show: true,
          type: violationType,
          message: res.message || 'Security Warning: Suspicious activity detected. Cheating or absence will cancel the interview.'
        });
      }
    }
  }, [isTerminated, interviewComplete, activeSession, reportViolation]);

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

  // ─── Speech recognition & Voice Proctoring ───────────────────────────────
  useEffect(() => {
    if (isMicOn) {
      speechManager.onError = (err) => {
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          if (isInsecureNetworkOrigin) {
            setSpeechError(`Microphone access is restricted by Chrome on network IP (${window.location.hostname}). Open on http://localhost:5173 for full microphone support.`);
          } else {
            setSpeechError('Microphone access denied. Click the 🔒 icon in your browser address bar and allow microphone access, then try again.');
          }
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
      speechManager.onVolumeChange = (vol) => {
        setMicVolume(vol);
      };
      speechManager.onVoiceAnomaly = (anomaly) => {
        handleProctoringViolation('MULTIPLE_VOICES', { anomalyType: anomaly?.type || 'multiple_voices' });
      };
      speechManager.startListening((liveText) => {
        setAnswerText(liveText);
        setSpeechError(null);
        setSpeechMetrics(analyzeTranscriptMetrics(liveText, timerSecondsRef.current));
      }, answerTextRef.current);
    } else {
      speechManager.stopListening();
      setMicVolume(0);
    }
    return () => {
      speechManager.onError = null;
      speechManager.onStateChange = null;
      speechManager.onVolumeChange = null;
      speechManager.onVoiceAnomaly = null;
      speechManager.stopListening();
    };
  }, [isMicOn, handleProctoringViolation]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-500/10 border border-indigo-300 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm">
            {interviewError}
          </div>
        )}
        <p className="text-slate-600 dark:text-slate-400">No active interview session.</p>
        <button onClick={() => onNavigate('new-interview')} className="px-6 py-2.5 rounded-xl glow-btn text-white font-bold text-sm">
          Start New Interview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* ─── Anti-Cheating Policy Warning Modal ────────────────────────────── */}
      {warningModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="rounded-3xl p-7 border border-amber-300 dark:border-amber-700/50 shadow-2xl max-w-md w-full mx-4 space-y-4 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Policy Violation Warning</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Active Session Monitoring</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {warningModal.message}
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
              Note: This security event has been logged to your proctoring audit trail. Cheating or exceeding 3 warnings will automatically cancel and terminate your interview.
            </div>
            <button
              onClick={() => setWarningModal({ show: false, message: '', type: '' })}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-all shadow-md shadow-amber-600/20"
            >
              I Understand &amp; Continue
            </button>
          </div>
        </div>
      )}

      {/* ─── Anti-Cheating Session Termination Modal ──────────────────────────── */}
      {(isTerminated || terminationModal.show) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="rounded-3xl p-7 border border-rose-300 dark:border-rose-700/50 shadow-2xl max-w-md w-full mx-4 space-y-4 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Session Terminated</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Violation Limit Exceeded</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {terminationModal.message || terminationReason || 'Session terminated because the violation limit was reached.'}
            </p>
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-bold">Session Status: Terminated for Policy Violation</p>
              <p>Further answering and evaluation are disabled for this session. Your previously submitted answers and evaluation feedback have been preserved.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => onNavigate('report')}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20"
              >
                View Saved Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Exit Confirmation Dialog ───────────────────────────────────────── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 dark:bg-black/75 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-8 border border-slate-300 dark:border-white/10 shadow-2xl max-w-sm w-full mx-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-indigo-300 dark:border-indigo-500/20 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Exit Interview?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Your progress so far will be saved.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              You've answered <strong className="text-slate-900 dark:text-white">{questionIndex}</strong> of <strong className="text-slate-900 dark:text-white">{total}</strong> questions.
              Exiting now will generate a partial report.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-300 dark:border-white/10 transition-colors">
                Continue Interview
              </button>
              <button onClick={handleExit} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-slate-900 dark:text-white text-sm font-bold transition-colors">
                Exit & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top Session Bar ────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500/30 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-700 dark:text-teal-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base font-['Outfit']">{activeSession.role || activeSession.category}</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-500/30 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-500/30">{activeSession.difficulty}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Question {questionIndex + 1} of {total}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:flex flex-1 max-w-xs flex-col gap-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>Progress</span><span>{questionIndex}/{total}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-teal-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VoiceVisualizer isSpeaking={isTtsSpeaking} isListening={isMicOn} />

          <button onClick={() => { if (isTtsSpeaking) speechManager.stopSpeaking(); setIsTtsMuted(!isTtsMuted); }}
            className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-teal-200 dark:border-white/10 shadow-xs" title={isTtsMuted ? 'Unmute AI' : 'Mute AI'}>
            {isTtsMuted ? <VolumeX className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-white/10 text-teal-800 dark:text-teal-200 text-xs font-mono font-bold shadow-xs">
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{timeFormatted}</span>
          </div>

          {/* Skip Question */}
          <button onClick={handleSkip} disabled={isLoadingQuestion || isEvaluating || isTerminated}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
            title="Skip this question">
            <SkipForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Skip</span>
          </button>

          {/* Exit Interview */}
          <button onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200/80 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-bold transition-colors shadow-xs"
            title="Exit interview">
            <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* ─── Network Origin / Localhost Switcher Notice ───────────────────── */}
      {isInsecureNetworkOrigin && (
        <div className="rounded-2xl p-3.5 bg-amber-500/15 border border-amber-400/30 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Network IP Detected ({window.location.hostname}):</strong> Chrome &amp; Edge restrict camera and voice recognition over insecure network IPs. For live webcam and speech-to-text, open on <strong>localhost</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              const port = window.location.port ? `:${window.location.port}` : '';
              window.location.href = `http://localhost${port}${window.location.pathname}${window.location.search}${window.location.hash}`;
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
          >
            Switch to http://localhost:5173
          </button>
        </div>
      )}

      {/* ─── Main Cockpit ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Question + Answer */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Question Card */}
          <div className="rounded-3xl p-6 lg:p-8 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/30 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-500/30">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> AI Interviewer Question
              </span>
              {currentQuestion?.topics && (
                <div className="flex flex-wrap gap-1.5">
                  {currentQuestion.topics.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-white dark:bg-white/10 px-2 py-0.5 rounded-md border border-violet-200 dark:border-white/10">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {isLoadingQuestion || isEvaluating ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {isEvaluating ? 'Evaluating your answer...' : 'AI is generating next question...'}
                </p>
              </div>
            ) : (
              <h3 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white leading-relaxed font-['Outfit']">
                "{currentQuestion?.question}"
              </h3>
            )}
          </div>

          {/* Code Editor */}
          {(currentQuestion?.type === 'coding' || activeSession.mode === 'coding') && (
            <CodeEditor 
              initialCode={currentQuestion?.codingPrompt} 
              onCodeChange={(c) => setCodeAnswer(c)}
              onViolation={handleClipboardViolation}
              isTerminated={isTerminated}
            />
          )}

          {/* Answer Area */}
          <div className="rounded-3xl p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Your Response</h4>
              </div>
              <div className="flex items-center gap-2">
                {isMicOn && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Listening</span>
                    <div className="flex items-end gap-0.5 h-3.5 ml-1">
                      {[0.15, 0.35, 0.55, 0.75].map((threshold, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                          style={{
                            height: micVolume >= threshold ? '100%' : '25%',
                            opacity: micVolume >= threshold ? 1 : 0.35
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  disabled={isLoadingQuestion || isEvaluating || isTerminated}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                    isMicOn
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-200/60'
                  }`}>
                  {isMicOn ? <Mic className="w-4 h-4 animate-bounce" /> : <MicOff className="w-4 h-4" />}
                  <span>{isMicOn ? 'Stop Recording' : 'Click to Speak'}</span>
                </button>
              </div>
            </div>

            {speechError && (
              <div className="text-rose-700 dark:text-rose-300 text-xs bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-200 dark:border-rose-500/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{speechError}</span>
              </div>
            )}

            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onCopy={handleClipboardViolation}
              onCut={handleClipboardViolation}
              onPaste={handleClipboardViolation}
              onKeyDown={handleTextareaKeyDown}
              disabled={isEvaluating || isLoadingQuestion || isTerminated}
              placeholder={
                isTerminated 
                  ? 'Session terminated due to policy violation. Answering is disabled.'
                  : (isMicOn ? 'Listening to your spoken answer... speak clearly.' : 'Click "Click to Speak" for voice input, or type your answer here...')
              }
              className={`w-full h-32 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:border-indigo-500 shadow-xs ${isTerminated ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
            />

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-blue-200/60 dark:border-white/5">
              <div className="flex items-center gap-4">
                <span>WPM: <strong className="text-blue-700 dark:text-blue-300">{speechMetrics.wpm || 0}</strong></span>
                <span>Words: <strong className="text-blue-700 dark:text-blue-300">{speechMetrics.wordCount || 0}</strong></span>
                <span className={speechMetrics.fillerCount > 3 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                  Fillers: <strong className={speechMetrics.fillerCount > 3 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-700 dark:text-blue-300'}>{speechMetrics.fillerCount || 0}</strong>
                </span>
              </div>
              {submitSuccess && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" /> Answer saved!
                </span>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitAnswer}
                disabled={isEvaluating || isLoadingQuestion || isTerminated}
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
          <EmotionTracker 
            isWebcamActive={isWebcamActive} 
            setIsWebcamActive={setIsWebcamActive} 
            fillerCount={speechMetrics.fillerCount}
            onProctoringViolation={handleProctoringViolation}
            proctoringWarnings={proctoringViolationCount}
            isTerminated={isTerminated}
          />

          <div className="rounded-2xl p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Interview Best Practices
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed font-medium">
              <li className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span><span>Use the <strong>STAR method</strong> for behavioral questions.</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span><span>Speak at <strong>120–140 WPM</strong> — steady and confident.</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span><span>Mention <strong>concrete metrics & architectural tradeoffs</strong>.</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span><span>Don't leave answers blank — describe your logical approach.</span></li>
            </ul>
          </div>

          {(tabSwitchCount > 0 || clipboardViolationCount > 0 || proctoringViolationCount > 0) && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Security & Proctoring Status</span>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p>Security Warnings: <strong className={proctoringViolationCount >= 2 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-700 dark:text-amber-300'}>{proctoringViolationCount} of 3</strong></p>
                {tabSwitchCount > 0 && (
                  <p>Tab switches recorded: <strong className="text-amber-700 dark:text-amber-300">{tabSwitchCount}</strong></p>
                )}
                {clipboardViolationCount > 0 && (
                  <p>Clipboard actions recorded: <strong className="text-amber-700 dark:text-amber-300">{clipboardViolationCount}</strong></p>
                )}
                {isTerminated && (
                  <p className="text-rose-600 dark:text-rose-400 font-bold mt-1">Status: Session Terminated</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
