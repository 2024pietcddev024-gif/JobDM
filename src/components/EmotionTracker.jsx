import React, { useRef, useEffect, useState } from 'react';
import { analyzeCameraFrame } from '../services/metricsEngine';
import { Camera, CameraOff, Eye, Smile, Activity, AlertCircle, ShieldCheck, Check, Info } from 'lucide-react';

export default function EmotionTracker({ isWebcamActive, setIsWebcamActive, fillerCount = 0 }) {
  const videoRef = useRef(null);
  const [metrics, setMetrics] = useState({
    eyeContactScore: null,
    emotion: null,
    confidenceLevel: null
  });
  const [hasCameraError, setHasCameraError] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [isLiveAnalysis, setIsLiveAnalysis] = useState(false);

  useEffect(() => {
    let stream = null;
    let interval = null;

    if (isWebcamActive) {
      navigator.mediaDevices?.getUserMedia?.({ video: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasCameraError(false);
          setIsLiveAnalysis(true);

          // Interval sampling metrics on real video element
          interval = setInterval(() => {
            if (videoRef.current) {
              const m = analyzeCameraFrame(videoRef.current);
              setMetrics(m);
            }
          }, 2000);
        })
        .catch((err) => {
          console.warn('[EmotionTracker] Camera access denied or device unavailable:', err);
          setHasCameraError(true);
          setIsLiveAnalysis(false);
          setMetrics({ eyeContactScore: null, emotion: null, confidenceLevel: null });
        });
    } else {
      setIsLiveAnalysis(false);
      setMetrics({ eyeContactScore: null, emotion: null, confidenceLevel: null });
    }

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (interval) clearInterval(interval);
    };
  }, [isWebcamActive]);

  const handleToggleCam = () => {
    if (isWebcamActive) {
      setIsWebcamActive(false);
      setHasCameraError(false);
    } else {
      setShowOptInModal(true);
    }
  };

  const handleConfirmOptIn = () => {
    setShowOptInModal(false);
    setIsWebcamActive(true);
  };

  return (
    <div className="glass-card rounded-2xl p-3 border border-slate-300 dark:border-white/10 overflow-hidden relative group space-y-2">
      {/* Video Container / Camera-Off Fallback */}
      <div className="relative aspect-video rounded-xl bg-white dark:bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/5">
        {isWebcamActive && !hasCameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-1">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-1 border border-slate-300 dark:border-white/10">
              {hasCameraError ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CameraOff className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
              {hasCameraError
                ? 'Camera Access Unavailable'
                : 'Audio-Only Mode (Camera Off)'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-[220px] leading-tight">
              {hasCameraError
                ? 'Camera permission denied or device not found. Continuing safely in audio-only mode without video analysis.'
                : 'Camera is optional. Your interview evaluation is based strictly on your verbal answers and code.'}
            </p>
          </div>
        )}

        {/* Live Status Indicator Badge */}
        {isLiveAnalysis && metrics.eyeContactScore !== null && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE ON-DEVICE
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-white/10">
              <Eye className="w-3 h-3" /> Gaze: {metrics.eyeContactScore}%
            </span>
            {metrics.emotion && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-white/10">
                <Smile className="w-3 h-3" /> {metrics.emotion}
              </span>
            )}
          </div>
        )}

        {/* Speech Filler Word Counter Badge */}
        <div className="absolute bottom-2 right-2 z-10">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-extrabold border ${
            fillerCount > 4 ? 'bg-rose-600/90 text-white border-rose-400' : 'bg-slate-900/80 text-white border-white/20'
          }`}>
            <AlertCircle className={`w-3.5 h-3.5 ${fillerCount > 4 ? 'text-white' : 'text-amber-400'}`} />
            Fillers: {fillerCount}
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          {isLiveAnalysis ? 'On-Device Face Coaching' : 'Presentation Coaching (Optional)'}
        </span>
        <button
          onClick={handleToggleCam}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            isWebcamActive 
              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/20 hover:bg-rose-500/30' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs'
          }`}
        >
          {isWebcamActive ? 'Disable Camera' : 'Enable Camera'}
        </button>
      </div>

      {/* Legal & Non-Decisive Hiring Notice */}
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <span>
          <strong>Coaching Notice:</strong> Facial & gaze indicators are formative presentation cues processed locally on your device. They are <strong>never stored on servers</strong>, shared with recruiters, or used for hiring decisions.
        </span>
      </div>

      {/* Explicit Opt-in Privacy Modal */}
      {showOptInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
              <Camera className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Enable Camera for Practice Coaching?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Camera access is entirely optional. It provides real-time eye contact and posture suggestions to help you practice your delivery.
            </p>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>100% On-Device:</strong> Video streams are never sent or recorded to our servers.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No Hiring Impact:</strong> Inferred emotion or gaze scores are strictly excluded from hiring verdicts or academic grades.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Camera-Off Anytime:</strong> You can practice in audio-only mode without any score penalty.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOptInModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Keep Camera Off
              </button>
              <button
                type="button"
                onClick={handleConfirmOptIn}
                className="px-5 py-2 rounded-xl glow-btn text-white text-xs font-bold shadow-md"
              >
                I Agree & Enable Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
