import { useEffect, useState } from "react";
import api from "../utils/api";
import { TrendingUp, AlertTriangle, Eye, Activity } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, subDays } from "date-fns";

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-card">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(3) : p.value}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [earHistory, setEarHistory] = useState([]);
  const [driverScores, setDriverScores] = useState([]);
  const [trendDays, setTrendDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/analytics/overview"),
      api.get(`/analytics/alerts-trend?days=${trendDays}`),
      api.get("/analytics/ear-history"),
      api.get("/analytics/driver-score"),
    ])
      .then(([ov, tr, ear, ds]) => {
        setOverview(ov.data.overview);

        // Build alert trend chart
        const days = Array.from({ length: trendDays }, (_, i) => {
          const d = subDays(new Date(), trendDays - 1 - i);
          return { date: format(d, "MMM d"), low: 0, medium: 0, high: 0, total: 0 };
        });
        tr.data.trend.forEach(({ _id, count }) => {
          const key = format(new Date(_id.date), "MMM d");
          const idx = days.findIndex((d) => d.date === key);
          if (idx >= 0) {
            days[idx][_id.level] = count;
            days[idx].total += count;
          }
        });
        setTrend(days);

        // EAR history (last 5 sessions)
        const earData = ear.data.sessions.map((s, i) => ({
          name: `Session ${ear.data.sessions.length - i}`,
          avgEar: parseFloat((s.avgEar || 0).toFixed(3)),
          minEar: parseFloat((s.minEar || 0).toFixed(3)),
          fatigue: s.fatigueScore || 0,
        })).reverse();
        setEarHistory(earData);

        // Driver score trend
        const scores = ds.data.scores.map((s) => ({
          date: format(new Date(s.date), "MMM d"),
          score: s.driverScore || 0,
          fatigue: s.fatigueScore || 0,
          alerts: s.totalAlerts || 0,
        })).reverse();
        setDriverScores(scores);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [trendDays]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Session insights and fatigue trends</p>
        </div>
        {/* Time range selector */}
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setTrendDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${trendDays === d ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      {!loading && overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Eye,           label: "Avg EAR",      value: (overview.avgEar).toFixed(3),    color: "text-brand-400" },
            { icon: AlertTriangle, label: "Total Alerts",  value: overview.totalAlerts,            color: "text-danger-400" },
            { icon: Activity,      label: "Avg Fatigue",   value: `${overview.avgFatigueScore}/100`, color: "text-warn-400" },
            { icon: TrendingUp,    label: "Sessions",      value: overview.totalSessions,          color: "text-success-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass-card p-5">
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert Trend Chart */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-1">Alert Trend</h2>
        <p className="text-xs text-gray-500 mb-6">Last {trendDays} days by severity</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trend}>
            <defs>
              {[
                { id: "high",   color: "#ef4444" },
                { id: "medium", color: "#f59e0b" },
                { id: "low",    color: "#10b981" },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CT />} />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
            <Area type="monotone" dataKey="high"   name="High"   stroke="#ef4444" fill="url(#g-high)"   strokeWidth={2} />
            <Area type="monotone" dataKey="medium" name="Medium" stroke="#f59e0b" fill="url(#g-medium)" strokeWidth={2} />
            <Area type="monotone" dataKey="low"    name="Low"    stroke="#10b981" fill="url(#g-low)"    strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* EAR History */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-1">EAR History (Last 5 Sessions)</h2>
          <p className="text-xs text-gray-500 mb-6">Average & minimum eye aspect ratio</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={earHistory} barSize={24} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 0.5]} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
              <ReferenceLine y={0.22} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} label={{ value: "threshold", position: "right", fill: "#ef4444", fontSize: 10 }} />
              <Bar dataKey="avgEar" name="Avg EAR" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="minEar" name="Min EAR" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Driver Score Trend */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-1">Driver Score Trend</h2>
          <p className="text-xs text-gray-500 mb-6">Safety score across recent sessions</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={driverScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1} />
              <Line type="monotone" dataKey="score" name="Driver Score" stroke="#6366f1" strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="fatigue" name="Fatigue Score" stroke="#f59e0b" strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 3 }} strokeDasharray="6 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
