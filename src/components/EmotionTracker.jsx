import React, { useRef, useEffect, useState } from 'react';
import { analyzeCameraFrame } from '../services/metricsEngine';
import { Camera, Eye, Smile, Activity, AlertCircle } from 'lucide-react';

export default function EmotionTracker({ isWebcamActive, setIsWebcamActive, fillerCount = 0 }) {
  const videoRef = useRef(null);
  const [metrics, setMetrics] = useState({
    eyeContactScore: 92,
    emotion: 'Focused',
    confidenceLevel: 'High'
  });
  const [hasCameraError, setHasCameraError] = useState(false);

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

          // Interval sampling metrics
          interval = setInterval(() => {
            const m = analyzeCameraFrame(videoRef.current);
            setMetrics(m);
          }, 2000);
        })
        .catch((err) => {
          console.warn('Webcam access error / fallback simulated video:', err);
          setHasCameraError(true);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (interval) clearInterval(interval);
    };
  }, [isWebcamActive]);

  return (
    <div className="glass-card rounded-2xl p-3 border border-white/10 overflow-hidden relative group">
      <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-white/5">
        {isWebcamActive && !hasCameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-2 border border-white/10">
              <Camera className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-300 font-semibold">
              {isWebcamActive ? 'Simulated AI Face Tracker' : 'Webcam Offline'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-[200px]">
              {isWebcamActive ? 'Analyzing posture & gaze' : 'Enable camera for eye contact & emotion AI feedback'}
            </p>
          </div>
        )}

        {/* Live Overlay Metrics Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
            <Eye className="w-3 h-3" /> Gaze: {metrics.eyeContactScore}%
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
            <Smile className="w-3 h-3" /> {metrics.emotion}
          </span>
        </div>

        {/* Filler Word Counter Badge */}
        <div className="absolute bottom-2 right-2 z-10">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-extrabold border ${
            fillerCount > 4 ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' : 'bg-black/70 text-slate-200 border-white/20'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Fillers: {fillerCount}
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between mt-2.5 px-1">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-400" /> AI Emotion & Eye Tracker
        </span>
        <button
          onClick={() => setIsWebcamActive(!isWebcamActive)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            isWebcamActive 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {isWebcamActive ? 'Disable Cam' : 'Enable Cam'}
        </button>
      </div>
    </div>
  );
}
