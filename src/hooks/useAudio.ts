import { useRef, useCallback, useEffect } from 'react';

/**
 * Web Audio API sound synthesis hook.
 * All sounds are procedurally generated — no audio asset files needed.
 * AudioContext is created lazily on the first user gesture.
 */
export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  /**
   * Ensures the AudioContext is created and running.
   * Resumes the context if it is suspended.
   */
  const ensureCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close();
      }
    };
  }, []);

  /**
   * Tile selection tick — rising pitch per tile added.
   * @param chainLen The current length of the chain.
   */
  const playSelect = useCallback((chainLen: number) => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300 + chainLen * 60, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }, [ensureCtx]);

  /**
   * Chain commit — cascade of pops, one per tile.
   * @param chainLen The number of tiles in the committed chain.
   * @param multiplierStep The current multiplier step.
   */
  const playMatch = useCallback((chainLen: number, multiplierStep: number) => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;
    const baseFreq = 400 + multiplierStep * 80;

    for (let i = 0; i < chainLen; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + i * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq + i * 25, startTime);
      osc.frequency.exponentialRampToValueAtTime(90, startTime + 0.06);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  }, [ensureCtx]);

  /**
   * Descending groan — loss sound.
   */
  const playFarkle = useCallback(() => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.5);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.6);
  }, [ensureCtx]);

  /**
   * Satisfying ascending chime — reward sound.
   * @param amount The amount banked (currently unused for sound generation).
   */
  const playBank = useCallback((amount: number) => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + i * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }, [ensureCtx]);

  /**
   * Deep thud + white noise burst — explosion sound.
   */
  const playBomb = useCallback(() => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;

    // PART 1 — Thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);

    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);

    // PART 2 — White noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();

    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.15);
  }, [ensureCtx]);

  /**
   * Sweeping shimmer — rainbow explosion sound.
   */
  const playRainbow = useCallback(() => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;
    const tones = [400, 600, 900, 1200, 1600, 2000];

    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + i * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }, [ensureCtx]);

  return {
    playSelect,
    playMatch,
    playFarkle,
    playBank,
    playBomb,
    playRainbow,
    ensureCtx
  };
}
