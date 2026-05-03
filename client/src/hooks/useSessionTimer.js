import { useState, useEffect, useRef } from "react";

/**
 * useSessionTimer — tracks elapsed session time in HH:MM:SS
 */
export default function useSessionTimer(isRunning) {
  const [elapsed, setElapsed] = useState(0); // seconds
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const reset = () => setElapsed(0);

  const format = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  };

  return { elapsed, formatted: format(elapsed), reset };
}
