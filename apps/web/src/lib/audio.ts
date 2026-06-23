/**
 * Programmatic Audio Synthesizer and Haptic Feedback Manager
 * Uses Web Audio API for zero-asset game sound synthesis (PWA & Offline friendly)
 * Uses HTML5 Vibration API for native haptic feedback
 */

class GameAudioManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;

  constructor() {
    // Load initial settings from localStorage if available
    if (typeof window !== "undefined") {
      const soundSetting = localStorage.getItem("rummy_sound_enabled");
      const vibrateSetting = localStorage.getItem("rummy_vibration_enabled");
      this.soundEnabled = soundSetting !== "false";
      this.vibrationEnabled = vibrateSetting !== "false";
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("rummy_sound_enabled", String(enabled));
    }
  }

  public setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("rummy_vibration_enabled", String(enabled));
    }
  }

  // --- Sound Effects Synthesizer ---
  
  public playDraw() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    // Quick sliding click (400Hz -> 850Hz) in 60ms
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playDiscard() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    // Soft thud (300Hz -> 120Hz) in 80ms
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playDrop() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "triangle";
    // Double tone (400Hz -> 250Hz) in 150ms
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(350, now + 0.05);
    osc.frequency.setValueAtTime(250, now + 0.10);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playWinner() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Play celebratory arpeggio (C major triad: C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const noteDuration = 0.08;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      gain.gain.setValueAtTime(0.08, now + idx * noteDuration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * noteDuration + 0.2);

      osc.start(now + idx * noteDuration);
      osc.stop(now + idx * noteDuration + 0.2);
    });
  }

  public playWrongShow() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Buzz sound (130Hz sawtooth wave) for 350ms
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.35);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // --- Haptic Feedback ---
  
  private vibrate(pattern: number | number[]) {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn("Vibration not allowed or failed:", e);
      }
    }
  }

  public triggerHapticDraw() {
    this.vibrate(15);
  }

  public triggerHapticDiscard() {
    this.vibrate(25);
  }

  public triggerHapticDrop() {
    this.vibrate([30, 30, 30]);
  }

  public triggerHapticWinner() {
    this.vibrate([100, 50, 100, 50, 200]);
  }

  public triggerHapticWrongShow() {
    this.vibrate(350);
  }

  public playYourTurn() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Play two quick, intense chimes: first one high (E5), second one higher (A5)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.start(now);
    osc1.stop(now + 0.1);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + 0.35);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.08 + 0.35);
  }

  public triggerHapticYourTurn() {
    // Intense: 2 quick pulses followed by a longer, stronger buzz
    this.vibrate([120, 80, 120, 80, 300]);
  }
}

export const gameAudio = new GameAudioManager();
