import { useState, useRef, useCallback } from "react";

/**
 * useAlertSound — plays browser Audio API beep tones for different alert levels.
 * No external assets needed.
 */
export default function useAlertSound() {
  const audioCtxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((frequency, duration, gain = 0.4, type = "sine") => {
    try {
      const ctx = getCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, [getCtx]);

  const playAlert = useCallback((level) => {
    if (level === "high") {
      // Urgent double beep
      playTone(880, 0.3, 0.6, "square");
      setTimeout(() => playTone(880, 0.3, 0.6, "square"), 400);
      setTimeout(() => playTone(660, 0.5, 0.5, "square"), 900);
    } else if (level === "medium") {
      // Single warning beep
      playTone(660, 0.4, 0.4, "triangle");
      setTimeout(() => playTone(550, 0.3, 0.3, "triangle"), 500);
    } else if (level === "low") {
      // Gentle notification
      playTone(440, 0.3, 0.25, "sine");
    }
  }, [playTone]);

  return { playAlert };
}
