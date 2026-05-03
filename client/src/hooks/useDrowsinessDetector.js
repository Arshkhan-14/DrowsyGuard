/**
 * useDrowsinessDetector
 * Manages the WebSocket connection to the Python AI service,
 * captures webcam frames via canvas, and dispatches detection results.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";

const AI_WS_URL = import.meta.env.VITE_AI_WS_URL || "ws://localhost:8001/ws";
const TARGET_FPS = 15;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export default function useDrowsinessDetector({ sessionId, onResult, onAlert }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const lastAlertRef = useRef({ level: "none", time: 0 });

  // ── Connect WebSocket ──────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${AI_WS_URL}/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("[WS] Connected to AI service");
    };

    ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        if (result.error) return;
        onResult?.(result);

        // Trigger alert callbacks
        const now = Date.now();
        const { alert_level, is_drowsy } = result;
        const last = lastAlertRef.current;

        const cooldown = alert_level === "high" ? 3000 : alert_level === "medium" ? 6000 : 10000;
        if (
          alert_level && alert_level !== "none" && is_drowsy &&
          (alert_level !== last.level || now - last.time > cooldown)
        ) {
          lastAlertRef.current = { level: alert_level, time: now };
          onAlert?.(result);
        }
      } catch (e) {
        console.error("[WS] Parse error", e);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
      console.warn("[WS] Connection error");
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("[WS] Disconnected");
    };
  }, [sessionId, onResult, onAlert]);

  // ── Start Camera ───────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access."
        : "Could not access camera: " + err.message;
      setCameraError(msg);
      toast.error(msg);
      return false;
    }
  }, []);

  // ── Frame Capture Loop ─────────────────────────────────────────
  const startCapture = useCallback(() => {
    if (intervalRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");

    intervalRef.current = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (video.readyState < 2) return;

      canvas.width = 320;
      canvas.height = 240;
      ctx.drawImage(video, 0, 0, 320, 240);

      const frame = canvas.toDataURL("image/jpeg", 0.7);
      wsRef.current.send(JSON.stringify({ frame }));
    }, FRAME_INTERVAL);
  }, []);

  // ── Start Detection ────────────────────────────────────────────
  const start = useCallback(async () => {
    const camOk = await startCamera();
    if (!camOk) return false;
    connectWS();
    // Wait briefly for WS to open before sending frames
    setTimeout(startCapture, 800);
    setIsRunning(true);
    return true;
  }, [startCamera, connectWS, startCapture]);

  // ── Stop Detection ─────────────────────────────────────────────
  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsRunning(false);
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    videoRef,
    canvasRef,
    isConnected,
    isRunning,
    cameraError,
    start,
    stop,
  };
}
