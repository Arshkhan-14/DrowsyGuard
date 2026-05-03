import { useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useDrowsinessDetector from "../hooks/useDrowsinessDetector";
import useAlertSound from "../hooks/useAlertSound";
import useSessionTimer from "../hooks/useSessionTimer";
import { MetricGauge, AlertLevelBadge, DrowsinessScoreRing, HeadPoseIndicator } from "../components/ui";
import api from "../utils/api";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  Play, Square, Wifi, WifiOff, Camera, Eye,
  AlertTriangle, Clock, Activity, Loader2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const MAX_EAR_HISTORY = 60;

export default function Monitor() {
  const { user } = useAuth();
  const { playAlert } = useAlertSound();
  const [metrics, setMetrics] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [earHistory, setEarHistory] = useState([]);
  const [sessionDbId, setSessionDbId] = useState(null);
  const [sessionStrId, setSessionStrId] = useState(null);
  const earHistoryRef = useRef([]);
  const sessionStartRef = useRef(null);

  // ── Session ID generation ────────────────────────────────────────
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const [timerRunning, setTimerRunning] = useState(false);
  const { formatted: timerFormatted, elapsed, reset: resetTimer } = useSessionTimer(timerRunning);

  // ── Alert callback ───────────────────────────────────────────────
  const handleAlert = useCallback(async (result) => {
    const { alert_level, ear, mar, drowsiness_score, pitch, yaw, is_drowsy, is_yawning, eyes_closed, head_tilted } = result;
    playAlert(alert_level);

    const trigger = eyes_closed ? "eyes_closed" : is_yawning ? "yawning" : head_tilted ? "head_tilt" : "combined";

    setAlertHistory((prev) => [
      { id: Date.now(), level: alert_level, trigger, score: drowsiness_score, time: new Date() },
      ...prev.slice(0, 49),
    ]);

    // Browser notification
    if (Notification.permission === "granted") {
      new Notification(`⚠️ DrowsyGuard Alert — ${alert_level.toUpperCase()}`, {
        body: `Drowsiness score: ${Math.round(drowsiness_score)}/100. ${trigger === "eyes_closed" ? "Eyes closed too long!" : trigger === "yawning" ? "Yawning detected!" : "Head tilt detected!"}`,
        icon: "/favicon.svg",
      });
    }

    // Log alert to backend
    if (sessionDbId && sessionStrId) {
      try {
        await api.post("/alerts", {
          sessionId: sessionDbId,
          sessionStringId: sessionStrId,
          level: alert_level,
          trigger,
          ear,
          mar,
          drowsinessScore: drowsiness_score,
          pitch,
          yaw,
        });
      } catch (e) {
        console.warn("Alert log failed:", e.message);
      }
    }
  }, [playAlert, sessionDbId, sessionStrId]);

  // ── Detection result callback ────────────────────────────────────
  const handleResult = useCallback((result) => {
    setMetrics(result);

    if (result.face_detected && result.ear) {
      const pt = { t: (Date.now() - (sessionStartRef.current || Date.now())) / 1000, v: result.ear };
      earHistoryRef.current = [...earHistoryRef.current.slice(-MAX_EAR_HISTORY + 1), pt];
      setEarHistory([...earHistoryRef.current]);
    }
  }, []);

  const { videoRef, canvasRef, isConnected, isRunning, cameraError, start, stop } = useDrowsinessDetector({
    sessionId,
    onResult: handleResult,
    onAlert: handleAlert,
  });

  // ── Start session ────────────────────────────────────────────────
  const handleStart = async () => {
    // Request notification permission
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    try {
      const res = await api.post("/sessions/start");
      setSessionDbId(res.data.session._id);
      setSessionStrId(res.data.sessionId);
      sessionStartRef.current = Date.now();

      const ok = await start();
      if (ok) {
        setTimerRunning(true);
        toast.success("Monitoring session started!");
      }
    } catch (err) {
      toast.error("Failed to start session: " + err.message);
    }
  };

  // ── Stop session ─────────────────────────────────────────────────
  const handleStop = async () => {
    stop();
    setTimerRunning(false);

    if (sessionDbId && sessionStrId) {
      try {
        const earVals = earHistoryRef.current.map((p) => p.v);
        const alertCounts = alertHistory.reduce((acc, a) => {
          acc[a.level] = (acc[a.level] || 0) + 1;
          return acc;
        }, {});

        await api.patch(`/sessions/${sessionStrId}/end`, {
          totalAlerts: alertHistory.length,
          lowAlerts: alertCounts.low || 0,
          mediumAlerts: alertCounts.medium || 0,
          highAlerts: alertCounts.high || 0,
          avgEar: earVals.length ? earVals.reduce((a, b) => a + b, 0) / earVals.length : 0,
          minEar: earVals.length ? Math.min(...earVals) : 0,
          maxEar: earVals.length ? Math.max(...earVals) : 0,
          fatigueScore: metrics?.drowsiness_score || 0,
          durationSeconds: elapsed,
          earTimeSeries: earHistoryRef.current,
        });

        toast.success("Session saved successfully!");
      } catch (err) {
        console.error("Session end failed:", err.message);
      }
    }

    setMetrics(null);
    setAlertHistory([]);
    earHistoryRef.current = [];
    setEarHistory([]);
    resetTimer();
  };

  const alertLevel = metrics?.alert_level || "none";
  const alertColorMap = { none: "", low: "border-success-500/40", medium: "border-warn-500/60 animate-glow-danger", high: "border-danger-500/80 animate-glow-danger" };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Monitor</h1>
          <p className="text-gray-400 text-sm mt-0.5">Real-time AI drowsiness detection</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={clsx("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
            isConnected ? "bg-success-500/15 text-success-400" : "bg-gray-500/15 text-gray-500")}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "AI Connected" : "Disconnected"}
          </div>

          {!isRunning ? (
            <button onClick={handleStart} className="btn-primary">
              <Play className="w-4 h-4" /> Start Session
            </button>
          ) : (
            <button onClick={handleStop} className="btn-danger">
              <Square className="w-4 h-4" /> Stop Session
            </button>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {alertLevel !== "none" && isRunning && (
        <div className={clsx("glass-card p-4 flex items-center gap-3 border-2 transition-all duration-300",
          alertLevel === "high" ? "border-danger-500/70 bg-alert-high" :
          alertLevel === "medium" ? "border-warn-500/50 bg-alert-medium" : "border-success-500/40 bg-alert-low")}>
          <AlertTriangle className={clsx("w-5 h-5 flex-shrink-0",
            alertLevel === "high" ? "text-danger-400" : alertLevel === "medium" ? "text-warn-400" : "text-success-400")} />
          <div>
            <p className="font-semibold text-white text-sm">
              {alertLevel === "high" ? "⚠️ CRITICAL: Pull over immediately!" :
               alertLevel === "medium" ? "⚠️ Warning: Drowsiness detected" :
               "ℹ️ Low fatigue level detected"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Score: {Math.round(metrics?.drowsiness_score || 0)}/100</p>
          </div>
          <AlertLevelBadge level={alertLevel} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* ── Camera Feed ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className={clsx("glass-card overflow-hidden border-2 transition-all duration-500",
            isRunning && alertLevel !== "none" ? alertColorMap[alertLevel] : "border-white/5")}>
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Video element */}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className={clsx("w-full h-full object-cover transition-opacity duration-500",
                  isRunning ? "opacity-100" : "opacity-0")}
              />

              {/* Overlay when not running */}
              {!isRunning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-surface-700 flex items-center justify-center border border-white/10">
                    <Camera className="w-8 h-8 text-gray-500" />
                  </div>
                  {cameraError ? (
                    <div className="text-center px-6">
                      <p className="text-danger-400 text-sm font-medium">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Camera preview will appear here</p>
                      <p className="text-gray-600 text-xs mt-1">Click "Start Session" to begin monitoring</p>
                    </div>
                  )}
                </div>
              )}

              {/* Scan line animation when running */}
              {isRunning && <div className="scan-line" />}

              {/* Status overlays */}
              {isRunning && (
                <>
                  {/* Top-left: Recording indicator */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-danger-400 animate-pulse" />
                    <span className="text-xs text-white font-medium">LIVE</span>
                  </div>

                  {/* Top-right: Timer */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                    <span className="text-xs text-white font-mono">{timerFormatted || "00:00:00"}</span>
                  </div>

                  {/* Bottom: FPS */}
                  {metrics && (
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-lg">
                      <span className="text-xs text-gray-400 font-mono">{metrics.fps} FPS</span>
                    </div>
                  )}

                  {/* No face warning */}
                  {metrics && !metrics.face_detected && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="bg-warn-500/90 text-white px-4 py-2 rounded-xl text-sm font-medium">
                        No face detected — please face the camera
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* EAR Timeline Chart */}
            {isRunning && earHistory.length > 2 && (
              <div className="p-4 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">EAR Over Time</p>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={earHistory}>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 0.5]} hide />
                    <Tooltip
                      formatter={(v) => [v.toFixed(3), "EAR"]}
                      contentStyle={{ background: "#16162a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px", color: "#fff" }}
                    />
                    <ReferenceLine y={user?.earThreshold || 0.22} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
                    <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-600 mt-1">Red line = drowsiness threshold ({user?.earThreshold || 0.22})</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Metrics Panel ────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Score Ring */}
          <div className="glass-card p-5 flex flex-col items-center">
            <DrowsinessScoreRing score={metrics?.drowsiness_score || 0} />
            {isRunning && (
              <div className="mt-3 flex items-center gap-2">
                <AlertLevelBadge level={metrics?.alert_level || "none"} />
              </div>
            )}
          </div>

          {/* EAR / MAR Gauges */}
          <div className="glass-card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Eye & Mouth Metrics</p>
            <div className="flex justify-around">
              <MetricGauge
                value={metrics?.ear || 0}
                max={0.5}
                label="EAR"
                color={metrics?.eyes_closed ? "#ef4444" : "#6366f1"}
              />
              <MetricGauge
                value={metrics?.mar || 0}
                max={1.2}
                label="MAR"
                color={metrics?.is_yawning ? "#f59e0b" : "#10b981"}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Blinks", value: metrics?.blink_count ?? "—" },
                { label: "Yawns",  value: metrics?.yawn_count ?? "—" },
                { label: "BPM",    value: metrics?.blink_rate?.toFixed(1) ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-xl py-2">
                  <p className="text-sm font-bold text-white font-mono">{value}</p>
                  <p className="text-xs text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Head Pose */}
          <div className="glass-card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Head Pose</p>
            <HeadPoseIndicator
              pitch={metrics?.pitch || 0}
              yaw={metrics?.yaw || 0}
              roll={metrics?.roll || 0}
            />
            {metrics?.head_tilted && (
              <p className="text-xs text-warn-400 mt-3 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Head tilt detected
              </p>
            )}
          </div>

          {/* Session Timer */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">Session Timer</p>
            </div>
            <p className="text-3xl font-mono font-bold text-white text-center">
              {timerFormatted || "00:00:00"}
            </p>
            {isRunning && (
              <p className="text-xs text-gray-600 text-center mt-1">{alertHistory.length} alerts this session</p>
            )}
          </div>
        </div>
      </div>

      {/* Alert History */}
      {alertHistory.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Recent Alerts</h3>
            <span className="text-xs text-gray-500">{alertHistory.length} this session</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alertHistory.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/5">
                <AlertLevelBadge level={a.level} />
                <span className="text-xs text-gray-400 flex-1 capitalize">{a.trigger.replace("_", " ")}</span>
                <span className="text-xs text-gray-600 font-mono">{a.time.toLocaleTimeString()}</span>
                <span className="text-xs font-mono text-warn-400">{Math.round(a.score)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
