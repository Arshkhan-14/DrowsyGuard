import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

/**
 * MetricGauge — circular SVG gauge showing 0–1 ratio (EAR/MAR)
 */
export function MetricGauge({ value, max = 1, label, color = "#6366f1", size = 96 }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
        <text x="48" y="48" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="14" fontFamily="JetBrains Mono" fontWeight="600">
          {value.toFixed(3)}
        </text>
      </svg>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

/**
 * AlertLevelBadge — animated severity indicator
 */
export function AlertLevelBadge({ level }) {
  const config = {
    none:   { label: "Safe",    cls: "badge-none",   dot: "bg-gray-400" },
    low:    { label: "Low Risk", cls: "badge-low",   dot: "bg-success-400" },
    medium: { label: "Warning", cls: "badge-medium", dot: "bg-warn-400 animate-pulse" },
    high:   { label: "DANGER",  cls: "badge-high",   dot: "bg-danger-400 animate-ping-slow" },
  };
  const { label, cls, dot } = config[level] || config.none;
  return (
    <span className={cls}>
      <span className={clsx("w-2 h-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

/**
 * StatCard — dashboard summary card
 */
export function StatCard({ icon: Icon, label, value, sub, color = "text-brand-400" }) {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx("p-2.5 rounded-xl bg-white/5", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="metric-value text-2xl">{value}</p>
      <p className="metric-label mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * DrowsinessScoreRing — large circular score display
 */
export function DrowsinessScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const color = score >= 75 ? "#ef4444" : score >= 55 ? "#f59e0b" : score >= 30 ? "#6366f1" : "#10b981";
  const label = score >= 75 ? "HIGH RISK" : score >= 55 ? "WARNING" : score >= 30 ? "MILD" : "SAFE";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="70" cy="70" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: "all 0.5s ease", filter: `drop-shadow(0 0 8px ${color}66)` }}
          />
          <text x="70" y="62" textAnchor="middle" fill="white" fontSize="28" fontFamily="JetBrains Mono" fontWeight="700">
            {Math.round(score)}
          </text>
          <text x="70" y="80" textAnchor="middle" fill={color} fontSize="9" fontFamily="Inter" fontWeight="600" letterSpacing="2">
            {label}
          </text>
        </svg>
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Drowsiness Score</p>
    </div>
  );
}

/**
 * HeadPoseIndicator — shows pitch/yaw/roll as colored bars
 */
export function HeadPoseIndicator({ pitch, yaw, roll }) {
  const toBar = (val, max) => Math.min(Math.abs(val) / max, 1) * 100;
  const isOk = (val, limit) => Math.abs(val) < limit;

  return (
    <div className="space-y-3">
      {[
        { label: "Pitch", value: pitch, max: 30, limit: 15, unit: "°" },
        { label: "Yaw",   value: yaw,   max: 45, limit: 25, unit: "°" },
        { label: "Roll",  value: roll,  max: 30, limit: 20, unit: "°" },
      ].map(({ label, value, max, limit, unit }) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{label}</span>
            <span className={clsx("font-mono font-medium", isOk(value, limit) ? "text-success-400" : "text-warn-400")}>
              {value >= 0 ? "+" : ""}{value.toFixed(1)}{unit}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all duration-300", isOk(value, limit) ? "bg-success-500" : "bg-warn-500")}
              style={{ width: `${toBar(value, max)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
