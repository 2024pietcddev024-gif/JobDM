/**
 * Speech Recognition (STT) and Speech Synthesis (TTS) Manager
 * Fixed: lastError tracking, transcript accumulation, voice selection timing
 */

export class SpeechManager {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;
    this.isListening = false;
    this.transcript = '';
    this.lastError = null;           // ← was never set before; now tracked properly
    this.onTranscriptUpdate = null;
    this.onStateChange = null;
    this.onError = null;
    this._voicesLoaded = false;

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
      // Build transcript from FINAL results only, append interim as preview
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      // Return the final portion to the callback so InterviewSession can append it cleanly
      const combined = (finalText + interimText).trim();
      if (combined && this.onTranscriptUpdate) {
        this.onTranscriptUpdate(combined);
      }
    };

    this.recognition.onerror = (event) => {
      this.lastError = event.error;   // ← FIX: was never stored
      console.warn('[SpeechManager] Recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
        if (this.onError) this.onError(event.error);
      } else if (event.error === 'no-speech') {
        // non-fatal — recognition will fire onend and we'll restart if still listening
      } else {
        if (this.onError) this.onError(event.error);
        this.stopListening();
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Only restart if we were not stopped by a permission error
        if (this.lastError !== 'not-allowed' && this.lastError !== 'service-not-allowed') {
          try {
            this.lastError = null;
            this.recognition.start();
          } catch (e) {
            // Already started — ignore InvalidStateError
          }
        } else {
          this.isListening = false;
          if (this.onStateChange) this.onStateChange(false);
        }
      }
    };
  }

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /** Start listening. The callback receives the FULL accumulated transcript so far. */
  startListening(onUpdate) {
    if (onUpdate) this.onTranscriptUpdate = onUpdate;
    this.lastError = null;

    if (!this.recognition) {
      if (this.onError) this.onError('not-supported');
      return;
    }

    if (this.isListening) return; // already running

    try {
      this.recognition.start();
      this.isListening = true;
      if (this.onStateChange) this.onStateChange(true);
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

    // Chrome TTS bug workaround — wrap in rAF
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
