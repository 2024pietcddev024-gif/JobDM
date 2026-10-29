import React, { useRef, useEffect, useState, useCallback } from 'react';
import { analyzeCameraFrame } from '../services/metricsEngine';
import { 
  Camera, CameraOff, Eye, Smile, Activity, AlertCircle, 
  ShieldCheck, ShieldAlert, Check, Info, Users, UserX, 
  RefreshCw, Lock
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

  // Request & attach camera stream
  const initializeCamera = useCallback(async () => {
    setHasCameraError(false);
    setCameraErrorMessage('');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support mediaDevices video capture.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn('[ProctoringCam] video play error:', e));
        };
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
        setCameraErrorMessage('Camera permission was denied. Please allow camera access in your browser settings to proceed with proctored interview.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraErrorMessage('No camera device detected. Please attach a webcam or enable your camera.');
      } else {
        setCameraErrorMessage(err.message || 'Unable to access video camera.');
      }
    }
  }, [setIsWebcamActive]);

  // Start camera on mount if active or if user turns it on
  useEffect(() => {
    if (isWebcamActive) {
      initializeCamera();
    } else {
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
  }, [isWebcamActive, initializeCamera]);

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

  // Real-time Face & Anti-Cheating Analysis Loop
  useEffect(() => {
    if (!isLiveAnalysis || !isWebcamActive || isTerminated) return;

    let detector = null;
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        // Native GPU-accelerated FaceDetector available in Chromium
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
          // fallback to canvas analysis
          detectedCount = analyzeCanvasFrame(video);
        }
      } else {
        // Fallback canvas frame analysis
        detectedCount = analyzeCanvasFrame(video);
        setFaceCount(detectedCount);
      }

      // Security Evaluation
      if (detectedCount === 0) {
        noFaceFramesRef.current += 1;
        lookingAwayFramesRef.current = 0;
        setFaceStatus('NO_FACE');

        // If face missing for >= 3 intervals (~4.5s)
        if (noFaceFramesRef.current >= 3) {
          reportSecurityViolation('FACE_NOT_DETECTED', {
            durationSeconds: Math.round(noFaceFramesRef.current * 1.5)
          });
        }
      } else if (detectedCount > 1) {
        noFaceFramesRef.current = 0;
        lookingAwayFramesRef.current = 0;
        setFaceStatus('MULTIPLE_FACES');

        // Immediate violation for second person
        reportSecurityViolation('MULTIPLE_FACES', {
          detectedFacesCount: detectedCount
        });
      } else {
        // Exactly 1 face
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
  }, [isLiveAnalysis, isWebcamActive, isTerminated, reportSecurityViolation]);

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
        // Standard normalized skin tone range in YCbCr/RGB
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 12) {
          skinPixels++;
          const pixelIndex = i / 4;
          const x = pixelIndex % 160;
          if (x < 70) leftHalfSkin++;
          else if (x > 90) rightHalfSkin++;
        }
      }

      // If skin pixels are under minimum threshold, no face is present
      if (skinPixels < 45) return 0;
      // If two widely separated large skin clusters are detected on both far ends
      if (leftHalfSkin > 80 && rightHalfSkin > 80) return 2;
      return 1;
    } catch (e) {
      return 1;
    }
  };

  const handleToggleCam = () => {
    if (isWebcamActive) {
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
        {isWebcamActive && !hasCameraError ? (
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
                {hasCameraError ? 'Camera Permission Required' : 'Camera Feed Paused'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-[260px] leading-tight mt-0.5">
                {cameraErrorMessage || 'Proctored interviews require a working camera to verify your identity and prevent cheating.'}
              </p>
            </div>

            <button
              onClick={initializeCamera}
              className="mt-1 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Grant / Start Camera
            </button>
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

        <button
          onClick={handleToggleCam}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            isWebcamActive 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300' 
              : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
          }`}
        >
          {isWebcamActive ? 'Disable Camera' : 'Enable Camera'}
        </button>
      </div>

      {/* Security Disclaimer Notice */}
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 leading-snug flex items-start gap-1.5">
        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500" />
        <span>
          <strong>Proctoring Notice:</strong> Face & voice activity are monitored continuously on-device. If cheating, absence, or secondary voices are detected (3 warnings), the interview is <strong>automatically terminated</strong>.
        </span>
      </div>
    </div>
  );
}
