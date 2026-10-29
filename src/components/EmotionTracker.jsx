import React, { useRef, useEffect, useState, useCallback } from 'react';
import { analyzeCameraFrame } from '../services/metricsEngine';
import { 
  Camera, CameraOff, Eye, Smile, Activity, AlertCircle, 
  ShieldCheck, ShieldAlert, Check, Info, Users, UserX, 
  RefreshCw, Lock, Sparkles, ExternalLink, Laptop, Radio
} from 'lucide-react';

export default function EmotionTracker({ 
  isWebcamActive, 
  setIsWebcamActive, 
  fillerCount = 0,
  onProctoringViolation = null,
  proctoringWarnings = 0,
  isTerminated = false
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const virtualCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const noFaceFramesRef = useRef(0);
  const lookingAwayFramesRef = useRef(0);

  const [metrics, setMetrics] = useState({
    eyeContactScore: null,
    emotion: null,
    confidenceLevel: null
  });

  const [hasCameraError, setHasCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const [isLiveAnalysis, setIsLiveAnalysis] = useState(false);
  const [faceStatus, setFaceStatus] = useState('SCANNING'); // 'VERIFIED' | 'NO_FACE' | 'MULTIPLE_FACES' | 'LOOKING_AWAY' | 'SCANNING'
  const [faceCount, setFaceCount] = useState(1);
  const [activeAlert, setActiveAlert] = useState(null);

  // Virtual AI Proctoring Simulation Mode (for devices without camera or insecure network IPs)
  const [isVirtualMode, setIsVirtualMode] = useState(false);
  const [virtualScenario, setVirtualScenario] = useState('NORMAL'); // 'NORMAL' | 'ABSENT' | 'MULTI_FACE' | 'LOOKING_AWAY'

  // Detect if user is visiting via network IP (which Chrome blocks from using navigator.mediaDevices on HTTP)
  const isInsecureNetworkOrigin = typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  // 1-Click switch to localhost
  const handleSwitchToLocalhost = () => {
    if (typeof window === 'undefined') return;
    const port = window.location.port ? `:${window.location.port}` : '';
    window.location.href = `http://localhost${port}${window.location.pathname}${window.location.search}${window.location.hash}`;
  };

  // Play short subtle audio alert on proctoring warning
  const playAlertSound = useCallback((frequency = 440) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context restricted until user interaction
    }
  }, []);

  // Multi-layer safe camera acquisition
  const getCameraStream = async () => {
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (idealErr) {
        console.warn('[ProctoringCam] Ideal constraints failed, falling back to basic video:true', idealErr);
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
    }

    const legacyGUM = navigator?.getUserMedia ||
      navigator?.webkitGetUserMedia ||
      navigator?.mozGetUserMedia ||
      navigator?.msGetUserMedia;

    if (legacyGUM) {
      return new Promise((resolve, reject) => {
        legacyGUM.call(navigator, { video: true, audio: false }, resolve, reject);
      });
    }

    throw new Error('MEDIA_DEVICES_NOT_SUPPORTED');
  };

  // Request & attach camera stream
  const initializeCamera = useCallback(async () => {
    setIsVirtualMode(false);
    setHasCameraError(false);
    setCameraErrorMessage('');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await getCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        try {
          await videoRef.current.play();
        } catch (e) {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(err => console.warn('[ProctoringCam] play error:', err));
          };
        }
      }

      setIsWebcamActive(true);
      setHasCameraError(false);
      setIsLiveAnalysis(true);
      setFaceStatus('SCANNING');
    } catch (err) {
      console.warn('[ProctoringCam] Camera acquisition failed:', err);
      setHasCameraError(true);
      setIsLiveAnalysis(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraErrorMessage('Camera permission was denied. Please allow camera access in your browser address bar to proceed with proctored interview.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraErrorMessage('No camera device detected. Please attach a webcam or use the Virtual AI Camera simulation.');
      } else if (err.message === 'MEDIA_DEVICES_NOT_SUPPORTED') {
        if (isInsecureNetworkOrigin) {
          setCameraErrorMessage(`Browsers block camera access over network IP (${window.location.hostname}). Chrome requires localhost or HTTPS for webcam access.`);
        } else {
          setCameraErrorMessage('Camera capture is not supported or blocked in this browser.');
        }
      } else {
        setCameraErrorMessage(err.message || 'Unable to access video camera.');
      }
    }
  }, [isInsecureNetworkOrigin, setIsWebcamActive]);

  // Start camera on mount if active or if user turns it on
  useEffect(() => {
    if (isWebcamActive && !isVirtualMode) {
      initializeCamera();
    } else if (!isWebcamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsLiveAnalysis(false);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current);
      }
    };
  }, [isWebcamActive, isVirtualMode, initializeCamera]);

  // Trigger violation with cooldown to prevent spam
  const reportSecurityViolation = useCallback((violationType, details = {}) => {
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 6000) return; // 6s cooldown
    lastViolationTimeRef.current = now;

    playAlertSound(320); // alert audio cue

    let alertMsg = '';
    if (violationType === 'MULTIPLE_FACES') {
      alertMsg = 'Multiple people detected in camera! Only one candidate is allowed.';
    } else if (violationType === 'FACE_NOT_DETECTED') {
      alertMsg = 'Face not detected! Please stay directly in front of the camera.';
    } else if (violationType === 'SUSPICIOUS_GAZE') {
      alertMsg = 'Looking away from screen detected. Please focus on the interview.';
    }

    setActiveAlert(alertMsg);
    setTimeout(() => setActiveAlert(null), 5000);

    if (onProctoringViolation) {
      onProctoringViolation(violationType, details);
    }
  }, [onProctoringViolation, playAlertSound]);

  // Real-time Face & Anti-Cheating Analysis Loop (For Real Camera)
  useEffect(() => {
    if (!isLiveAnalysis || !isWebcamActive || isVirtualMode || isTerminated) return;

    let detector = null;
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      } catch (e) {
        detector = null;
      }
    }

    proctorIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      // Regular emotion & gaze metrics
      const m = analyzeCameraFrame(video);
      setMetrics(m);

      // PROCTORING: Scan for Face presence and multiple persons
      let detectedCount = 1;
      let isGazeLookingAway = false;

      if (detector) {
        try {
          const faces = await detector.detect(video);
          detectedCount = faces.length;
          setFaceCount(detectedCount);

          if (detectedCount === 1) {
            const face = faces[0];
            const videoWidth = video.videoWidth || 640;
            const centerX = (face.boundingBox.x + face.boundingBox.width / 2) / videoWidth;
            if (centerX < 0.22 || centerX > 0.78) {
              isGazeLookingAway = true;
            }
          }
        } catch (e) {
          detectedCount = analyzeCanvasFrame(video);
        }
      } else {
        detectedCount = analyzeCanvasFrame(video);
        setFaceCount(detectedCount);
      }

      // Security Evaluation
      if (detectedCount === 0) {
        noFaceFramesRef.current += 1;
        lookingAwayFramesRef.current = 0;
        setFaceStatus('NO_FACE');

        if (noFaceFramesRef.current >= 3) {
          reportSecurityViolation('FACE_NOT_DETECTED', {
            durationSeconds: Math.round(noFaceFramesRef.current * 1.5)
          });
        }
      } else if (detectedCount > 1) {
        noFaceFramesRef.current = 0;
        lookingAwayFramesRef.current = 0;
        setFaceStatus('MULTIPLE_FACES');

        reportSecurityViolation('MULTIPLE_FACES', {
          detectedFacesCount: detectedCount
        });
      } else {
        noFaceFramesRef.current = 0;

        if (isGazeLookingAway) {
          lookingAwayFramesRef.current += 1;
          setFaceStatus('LOOKING_AWAY');
          if (lookingAwayFramesRef.current >= 3) {
            reportSecurityViolation('SUSPICIOUS_GAZE', {
              note: 'Head/gaze turned away from screen repeatedly'
            });
          }
        } else {
          lookingAwayFramesRef.current = 0;
          setFaceStatus('VERIFIED');
        }
      }
    }, 1500);

    return () => {
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current);
      }
    };
  }, [isLiveAnalysis, isWebcamActive, isVirtualMode, isTerminated, reportSecurityViolation]);

  // Fallback Canvas Skin & Centroid Analysis for non-FaceDetector browsers
  const analyzeCanvasFrame = (video) => {
    try {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        canvasRef.current = canvas;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, 160, 120);

      const frame = ctx.getImageData(0, 0, 160, 120);
      const data = frame.data;
      let skinPixels = 0;
      let leftHalfSkin = 0;
      let rightHalfSkin = 0;

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 12) {
          skinPixels++;
          const pixelIndex = i / 4;
          const x = pixelIndex % 160;
          if (x < 70) leftHalfSkin++;
          else if (x > 90) rightHalfSkin++;
        }
      }

      if (skinPixels < 45) return 0;
      if (leftHalfSkin > 80 && rightHalfSkin > 80) return 2;
      return 1;
    } catch (e) {
      return 1;
    }
  };

  // ─── Virtual AI Proctor Animation & Simulation Loop ───────────────────────
  const drawCandidateFigure = (ctx, cx, cy, color, breathY, turnedAway = false) => {
    // Shoulders
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 90, 75, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 16, cy + 30, 32, 35);

    // Head
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(cx + (turnedAway ? 20 : 0), cy - 20, 42, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(cx + (turnedAway ? 20 : 0), cy - 35, 44, Math.PI, 0);
    ctx.fill();

    // Eyes
    const now = Date.now();
    const isBlink = (now % 3500) < 180;
    if (!turnedAway) {
      if (isBlink) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy - 20);
        ctx.lineTo(cx - 8, cy - 20);
        ctx.moveTo(cx + 8, cy - 20);
        ctx.lineTo(cx + 24, cy - 20);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx - 16, cy - 20, 8, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 16, cy - 20, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(cx - 16, cy - 20, 3.5, 0, Math.PI * 2);
        ctx.arc(cx + 16, cy - 20, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 12, 12, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(cx + 38, cy - 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useEffect(() => {
    if (!isVirtualMode || isTerminated) return;

    let animId;
    let tickCount = 0;
    const canvas = virtualCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderVirtualFeed = () => {
      tickCount++;
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Sweeping radar scan line
      const scanY = (tickCount * 2) % h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 5);
      scanGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      scanGrad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 20, w, 25);

      const time = Date.now() / 1000;
      const breathY = Math.sin(time * 2.5) * 3;

      if (virtualScenario === 'NORMAL') {
        drawCandidateFigure(ctx, w / 2, h / 2 + 35 + breathY, '#6366f1', breathY, false);

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(w / 2 - 80, h / 2 - 95 + breathY, 160, 200);
        ctx.setLineDash([]);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('CANDIDATE: ID #4829 [VERIFIED]', w / 2 - 75, h / 2 - 105 + breathY);
      } else if (virtualScenario === 'ABSENT') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(w / 2 - 90, h / 2 - 80, 180, 170);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(w / 2 - 90, h / 2 - 80, 180, 170);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ NO CANDIDATE DETECTED', w / 2, h / 2);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('Student moved out of camera frame', w / 2, h / 2 + 20);
        ctx.textAlign = 'left';
      } else if (virtualScenario === 'MULTI_FACE') {
        // Candidate 1
        drawCandidateFigure(ctx, w / 2 - 90, h / 2 + 40 + breathY, '#6366f1', breathY, false);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 145, h / 2 - 70 + breathY, 110, 150);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('CANDIDATE [P1]', w / 2 - 140, h / 2 - 78 + breathY);

        // Person 2
        drawCandidateFigure(ctx, w / 2 + 90, h / 2 + 45 + breathY, '#ef4444', breathY, false);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(w / 2 + 35, h / 2 - 70 + breathY, 110, 150);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('UNAUTHORIZED [P2]', w / 2 + 40, h / 2 - 78 + breathY);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(w / 2 - 130, 15, 260, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚨 MULTIPLE FACES DETECTED IN FRAME', w / 2, 30);
        ctx.textAlign = 'left';
      } else if (virtualScenario === 'LOOKING_AWAY') {
        drawCandidateFigure(ctx, w / 2, h / 2 + 35 + breathY, '#f59e0b', breathY, true);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 80, h / 2 - 95 + breathY, 160, 200);

        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2 + 10, h / 2 - 30 + breathY);
        ctx.lineTo(w / 2 + 100, h / 2 - 30 + breathY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w / 2 + 100, h / 2 - 30 + breathY);
        ctx.lineTo(w / 2 + 88, h / 2 - 38 + breathY);
        ctx.lineTo(w / 2 + 88, h / 2 - 22 + breathY);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('GAZE VECTOR: OFF-SCREEN', w / 2 - 75, h / 2 - 105 + breathY);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '9px monospace';
      ctx.fillText('AI PROCTOR SIMULATOR • 30 FPS', 12, h - 12);

      animId = requestAnimationFrame(renderVirtualFeed);
    };

    renderVirtualFeed();
    return () => cancelAnimationFrame(animId);
  }, [isVirtualMode, virtualScenario, isTerminated]);

  // Virtual Mode Proctoring Interval
  useEffect(() => {
    if (!isVirtualMode || isTerminated) return;

    const interval = setInterval(() => {
      if (virtualScenario === 'NORMAL') {
        setFaceStatus('VERIFIED');
        setFaceCount(1);
        noFaceFramesRef.current = 0;
        lookingAwayFramesRef.current = 0;
        setMetrics({ eyeContactScore: 92, emotion: 'Focused', confidenceLevel: 'High' });
      } else if (virtualScenario === 'ABSENT') {
        setFaceStatus('NO_FACE');
        setFaceCount(0);
        noFaceFramesRef.current += 1;
        setMetrics({ eyeContactScore: 0, emotion: 'Absent', confidenceLevel: 'None' });
        if (noFaceFramesRef.current >= 3) {
          reportSecurityViolation('FACE_NOT_DETECTED', { durationSeconds: 5 });
        }
      } else if (virtualScenario === 'MULTI_FACE') {
        setFaceStatus('MULTIPLE_FACES');
        setFaceCount(2);
        noFaceFramesRef.current = 0;
        setMetrics({ eyeContactScore: 65, emotion: 'Distracted', confidenceLevel: 'Medium' });
        reportSecurityViolation('MULTIPLE_FACES', { detectedFacesCount: 2 });
      } else if (virtualScenario === 'LOOKING_AWAY') {
        setFaceStatus('LOOKING_AWAY');
        setFaceCount(1);
        lookingAwayFramesRef.current += 1;
        setMetrics({ eyeContactScore: 28, emotion: 'Unfocused', confidenceLevel: 'Low' });
        if (lookingAwayFramesRef.current >= 2) {
          reportSecurityViolation('SUSPICIOUS_GAZE', { note: 'Gaze diverted from interview window' });
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isVirtualMode, virtualScenario, isTerminated, reportSecurityViolation]);

  const handleToggleCam = () => {
    if (isVirtualMode) {
      setIsVirtualMode(false);
      setIsWebcamActive(false);
    } else if (isWebcamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsWebcamActive(false);
      setHasCameraError(false);
    } else {
      initializeCamera();
    }
  };

  return (
    <div className="glass-card rounded-2xl p-3 border border-slate-300 dark:border-white/10 overflow-hidden relative group space-y-2">
      {/* Active Proctoring Alert Banner */}
      {activeAlert && (
        <div className="p-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-in slide-in-from-top duration-200">
          <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
          <span className="flex-1 leading-tight">{activeAlert}</span>
        </div>
      )}

      {/* Video Container / Feed */}
      <div className={`relative aspect-video rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border transition-all ${
        faceStatus === 'NO_FACE' || faceStatus === 'MULTIPLE_FACES'
          ? 'border-rose-500 ring-2 ring-rose-500/50'
          : faceStatus === 'LOOKING_AWAY'
          ? 'border-amber-500 ring-1 ring-amber-500/40'
          : 'border-slate-800'
      }`}>
        {isVirtualMode ? (
          <>
            <canvas
              ref={virtualCanvasRef}
              width={640}
              height={480}
              className="w-full h-full object-cover"
            />

            {/* Live Proctoring Status Badge for Virtual Mode */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-950/90 backdrop-blur-md text-[10px] font-black text-indigo-300 tracking-wider uppercase border border-indigo-500/40">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                VIRTUAL AI PROCTOR
              </span>

              {faceStatus === 'VERIFIED' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                  <Check className="w-3 h-3 text-emerald-400" /> Face Verified (1 Person)
                </span>
              )}

              {faceStatus === 'NO_FACE' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/90 backdrop-blur-md text-[10px] font-black text-rose-300 border border-rose-500/50 animate-pulse">
                  <UserX className="w-3 h-3 text-rose-400" /> No Face Detected
                </span>
              )}

              {faceStatus === 'MULTIPLE_FACES' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/90 backdrop-blur-md text-[10px] font-black text-rose-300 border border-rose-500/50 animate-pulse">
                  <Users className="w-3 h-3 text-rose-400" /> Multiple Faces ({faceCount})
                </span>
              )}

              {faceStatus === 'LOOKING_AWAY' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/90 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-500/40">
                  <Eye className="w-3 h-3 text-amber-400" /> Looking Away
                </span>
              )}
            </div>
          </>
        ) : isWebcamActive && !hasCameraError ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Target Face Guide Box / Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className={`w-36 h-48 rounded-full border-2 border-dashed transition-colors ${
                faceStatus === 'VERIFIED'
                  ? 'border-emerald-400/50'
                  : faceStatus === 'NO_FACE' || faceStatus === 'MULTIPLE_FACES'
                  ? 'border-rose-500 animate-pulse'
                  : 'border-amber-400/60'
              }`} />
            </div>

            {/* Live Proctoring Status Badge */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-md text-[10px] font-black tracking-wider uppercase border border-white/10">
                <span className={`w-2 h-2 rounded-full ${
                  faceStatus === 'VERIFIED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'
                }`} />
                PROCTORED FEED
              </span>

              {faceStatus === 'VERIFIED' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                  <Check className="w-3 h-3 text-emerald-400" /> Face Verified (1 Person)
                </span>
              )}

              {faceStatus === 'NO_FACE' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/90 backdrop-blur-md text-[10px] font-black text-rose-300 border border-rose-500/50 animate-pulse">
                  <UserX className="w-3 h-3 text-rose-400" /> No Face Detected
                </span>
              )}

              {faceStatus === 'MULTIPLE_FACES' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/90 backdrop-blur-md text-[10px] font-black text-rose-300 border border-rose-500/50 animate-pulse">
                  <Users className="w-3 h-3 text-rose-400" /> Multiple Faces ({faceCount})
                </span>
              )}

              {faceStatus === 'LOOKING_AWAY' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/90 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-500/40">
                  <Eye className="w-3 h-3 text-amber-400" /> Looking Away
                </span>
              )}
            </div>
          </>
        ) : (
          /* Camera Off / Permission Required Fallback */
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500">
              {hasCameraError ? <ShieldAlert className="w-6 h-6 text-rose-500" /> : <Camera className="w-6 h-6 text-amber-500" />}
            </div>
            
            <div>
              <p className="text-xs font-bold text-white">
                {hasCameraError 
                  ? (isInsecureNetworkOrigin ? 'Browser Camera Restriction (Network IP)' : 'Camera Permission Required') 
                  : 'Camera Feed Paused'}
              </p>
              <p className="text-[11px] text-slate-300 max-w-[280px] leading-tight mt-0.5">
                {isInsecureNetworkOrigin
                  ? `Chrome & Edge block camera/mic on network IP (${window?.location?.hostname}). Switch to localhost for real camera or use Virtual AI Camera.`
                  : (cameraErrorMessage || 'Proctored interviews require a camera to verify identity. Click below to grant permission, or use Virtual AI Camera.')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs pt-1">
              {isInsecureNetworkOrigin ? (
                <button
                  onClick={handleSwitchToLocalhost}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Switch to localhost:5173
                </button>
              ) : (
                <button
                  onClick={initializeCamera}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Grant / Start Camera
                </button>
              )}

              <button
                onClick={() => {
                  setHasCameraError(false);
                  setIsVirtualMode(true);
                  setIsLiveAnalysis(true);
                  setFaceStatus('VERIFIED');
                }}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Virtual AI Camera
              </button>
            </div>
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

      {/* Virtual AI Proctoring Test Suite Controls (Shown when in Virtual Mode) */}
      {isVirtualMode && (
        <div className="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Virtual AI Proctoring Simulator
            </span>
            <button
              onClick={() => {
                setIsVirtualMode(false);
                initializeCamera();
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 transition-colors"
            >
              Try Real Camera
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
            <button
              onClick={() => { setVirtualScenario('NORMAL'); noFaceFramesRef.current = 0; }}
              className={`p-1.5 rounded-lg border text-center transition-all ${
                virtualScenario === 'NORMAL' ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Candidate verified in frame"
            >
              ✓ 1 Face
            </button>
            <button
              onClick={() => { setVirtualScenario('ABSENT'); }}
              className={`p-1.5 rounded-lg border text-center transition-all ${
                virtualScenario === 'ABSENT' ? 'bg-rose-600 text-white border-rose-400 shadow-xs' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Simulate student leaving camera"
            >
              🚫 Leave
            </button>
            <button
              onClick={() => { setVirtualScenario('MULTI_FACE'); }}
              className={`p-1.5 rounded-lg border text-center transition-all ${
                virtualScenario === 'MULTI_FACE' ? 'bg-rose-600 text-white border-rose-400 shadow-xs' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Simulate 2nd person in camera"
            >
              👥 2nd Person
            </button>
            <button
              onClick={() => { setVirtualScenario('LOOKING_AWAY'); }}
              className={`p-1.5 rounded-lg border text-center transition-all ${
                virtualScenario === 'LOOKING_AWAY' ? 'bg-amber-600 text-white border-amber-400 shadow-xs' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Simulate looking away from screen"
            >
              👀 Look Away
            </button>
          </div>
        </div>
      )}

      {/* Control & Security HUD */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Anti-Cheat AI Proctor
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
            proctoringWarnings > 0
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300'
          }`}>
            Warnings: {proctoringWarnings}/3
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isVirtualMode && hasCameraError && (
            <button
              onClick={() => {
                setHasCameraError(false);
                setIsVirtualMode(true);
                setIsLiveAnalysis(true);
                setFaceStatus('VERIFIED');
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 transition-colors"
            >
              Virtual Cam
            </button>
          )}

          <button
            onClick={handleToggleCam}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
              (isWebcamActive || isVirtualMode)
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300' 
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
            }`}
          >
            {(isWebcamActive || isVirtualMode) ? 'Disable Camera' : 'Enable Camera'}
          </button>
        </div>
      </div>

      {/* Security Disclaimer Notice */}
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug flex items-start gap-1.5">
        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500" />
        <span>
          <strong>Proctoring Notice:</strong> Face &amp; voice activity are monitored continuously on-device. If cheating, absence, or secondary voices are detected (3 warnings), the interview is <strong>automatically terminated</strong>.
        </span>
      </div>
    </div>
  );
}