/**
 * Speech Recognition (STT), Speech Synthesis (TTS), and Voice Proctoring Manager
 * Features:
 *  - Non-destructive transcript accumulation (never wipes previously spoken sentences)
 *  - AudioContext mic analysis with live audio level metering
 *  - Voice Proctoring: Secondary speaker / multi-voice anomaly detection
 *  - Robust error handling and auto-recovery
 */

export class SpeechManager {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;
    this.isListening = false;
    this.baseText = '';
    this.accumulatedTranscript = '';
    this.lastError = null;
    this.onTranscriptUpdate = null;
    this.onStateChange = null;
    this.onError = null;
    this.onVolumeChange = null;
    this.onVoiceAnomaly = null;
    this._voicesLoaded = false;

    // AudioContext proctoring
    this.audioContext = null;
    this.audioStream = null;
    this.analyser = null;
    this.animFrameId = null;
    this.lastVoiceAnomalyTime = 0;
    this.speakerProfile = { baselinePitch: null, sampleCount: 0 };

    this.initRecognition();
    this._preloadVoices();
  }

  /** Pre-load voices (Chrome loads them async) */
  _preloadVoices() {
    if (!this.synthesis) return;
    const load = () => { this._voicesLoaded = true; };
    if (this.synthesis.getVoices().length > 0) {
      this._voicesLoaded = true;
    } else {
      this.synthesis.addEventListener('voiceschanged', load, { once: true });
    }
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item && item[0]) {
          if (item.isFinal) {
            currentFinal += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }
      }

      if (currentFinal) {
        this.accumulatedTranscript += currentFinal;
      }

      // Combine base text + accumulated completed text + live interim words
      const combined = (
        (this.baseText ? this.baseText.trim() + ' ' : '') +
        this.accumulatedTranscript +
        currentInterim
      ).trim();

      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(combined);
      }
    };

    this.recognition.onerror = (event) => {
      this.lastError = event.error;
      console.warn('[SpeechManager] Recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
        if (this.onError) this.onError(event.error);
        this._stopAudioMonitoring();
      } else if (event.error === 'no-speech') {
        // Non-fatal: recognition continues or restarts cleanly
      } else {
        if (this.onError) this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Only restart if not stopped by permission denial
        if (this.lastError !== 'not-allowed' && this.lastError !== 'service-not-allowed') {
          try {
            this.lastError = null;
            this.recognition.start();
          } catch (e) {
            // Already started or busy
          }
        } else {
          this.isListening = false;
          if (this.onStateChange) this.onStateChange(false);
          this._stopAudioMonitoring();
        }
      }
    };
  }

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /** Start listening. Accepts optional initialText so prior answers are never wiped */
  startListening(onUpdate, initialText = '') {
    if (onUpdate) this.onTranscriptUpdate = onUpdate;
    this.baseText = initialText ? initialText.trim() + ' ' : '';
    this.accumulatedTranscript = '';
    this.lastError = null;

    if (!this.recognition) {
      if (this.onError) this.onError('not-supported');
      return;
    }

    if (this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
      if (this.onStateChange) this.onStateChange(true);
      this._startAudioMonitoring();
    } catch (err) {
      console.warn('[SpeechManager] start() exception:', err);
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    if (this.onStateChange) this.onStateChange(false);
    this._stopAudioMonitoring();
  }

  /** Start Web Audio analyser for volume visualization and voice proctoring */
  async _startAudioMonitoring() {
    if (this.audioStream) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioStream = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.6;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const monitorLoop = () => {
        if (!this.isListening || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        // 1. Calculate Average Audio Volume (RMS)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));

        if (this.onVolumeChange) {
          this.onVolumeChange(normalizedVolume);
        }

        // 2. Voice Proctoring: Detect Secondary Speaker / Multi-voice Anomaly
        // Voice frequencies typically fall between 85Hz - 340Hz.
        // If there are two widely separated strong resonant frequency bands speaking simultaneously
        if (normalizedVolume > 20) {
          const sampleRate = this.audioContext.sampleRate || 44100;
          const binSize = sampleRate / 512;

          // Low voice band (80Hz - 160Hz) vs Mid/High voice band (220Hz - 450Hz)
          let lowBandEnergy = 0;
          let highBandEnergy = 0;

          for (let i = 1; i < bufferLength; i++) {
            const freq = i * binSize;
            if (freq >= 80 && freq <= 170) lowBandEnergy += dataArray[i];
            else if (freq >= 240 && freq <= 480) highBandEnergy += dataArray[i];
          }

          // If dual distinct energetic pitch centers are detected simultaneously with high volume
          const now = Date.now();
          if (lowBandEnergy > 500 && highBandEnergy > 500 && (now - this.lastVoiceAnomalyTime > 8000)) {
            this.lastVoiceAnomalyTime = now;
            if (this.onVoiceAnomaly) {
              this.onVoiceAnomaly({
                type: 'MULTIPLE_VOICES',
                message: 'Secondary voice detected. Only one candidate allowed to speak during interview.'
              });
            }
          }
        }

        this.animFrameId = requestAnimationFrame(monitorLoop);
      };

      this.animFrameId = requestAnimationFrame(monitorLoop);
    } catch (err) {
      console.warn('[SpeechManager] Audio proctoring init error:', err);
    }
  }

  _stopAudioMonitoring() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(t => t.stop());
      this.audioStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  /** Speak text aloud. Waits for voices to be ready in Chrome. */
  speakText(text, onEndCallback) {
    if (!this.synthesis || !text) return;

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const assignVoice = () => {
      const voices = this.synthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Natural') ||
         v.name.includes('Samantha') || v.name.includes('Daniel') ||
         v.name.includes('Karen') || v.name.includes('Moira'))
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
    };

    if (this._voicesLoaded) {
      assignVoice();
    } else {
      this.synthesis.addEventListener('voiceschanged', () => { assignVoice(); }, { once: true });
    }

    utterance.onend = onEndCallback || null;
    utterance.onerror = (e) => {
      console.warn('[SpeechManager] TTS error:', e.error);
      if (onEndCallback) onEndCallback();
    };

    requestAnimationFrame(() => {
      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

export const speechManager = new SpeechManager();
