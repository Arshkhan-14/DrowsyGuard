import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { StatCard } from "../components/ui";
import {
  Video, Bell, Clock, TrendingUp, AlertTriangle,
  Eye, Zap, ArrowRight, Shield,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { format, subDays } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/alerts-trend?days=7"),
    ])
      .then(([ov, tr]) => {
        setOverview(ov.data.overview);

        // Build a 7-day chart array
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = subDays(new Date(), 6 - i);
          return { date: format(d, "MMM dd"), low: 0, medium: 0, high: 0 };
        });

        tr.data.trend.forEach(({ _id, count }) => {
          const idx = days.findIndex((d) => d.date === format(new Date(_id.date), "MMM dd"));
          if (idx >= 0) days[idx][_id.level] = count;
        });

        setTrend(days);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const driverScoreColor =
    (user?.driverScore || 100) >= 80
      ? "text-success-400"
      : (user?.driverScore || 100) >= 60
      ? "text-warn-400"
      : "text-danger-400";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},{" "}
            {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's your safety overview</p>
        </div>
        <Link to="/monitor" className="btn-primary">
          <Video className="w-4 h-4" /> Start Monitoring
        </Link>
      </div>

      {/* Driver Score Banner */}
      <div className="glass-card p-5 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(16,16,30,0.9) 100%)" }}>
        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-8 h-8 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Driver Safety Score</p>
          <p className={`text-4xl font-bold font-mono ${driverScoreColor}`}>
            {user?.driverScore ?? 100}<span className="text-lg text-gray-500">/100</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(user?.driverScore ?? 100) >= 80 ? "🟢 Excellent driving habits" : (user?.driverScore ?? 100) >= 60 ? "🟡 Moderate fatigue detected" : "🔴 High fatigue risk — rest recommended"}
          </p>
        </div>
        <Link to="/monitor" className="btn-ghost flex-shrink-0">
          Monitor <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Video}         label="Total Sessions"   value={overview?.totalSessions ?? 0}  color="text-brand-400" />
          <StatCard icon={Bell}          label="Total Alerts"     value={overview?.totalAlerts ?? 0}    color="text-danger-400" />
          <StatCard icon={Eye}           label="Avg EAR"          value={(overview?.avgEar ?? 0).toFixed(3)} color="text-success-400"
            sub="Eye Aspect Ratio" />
          <StatCard icon={Clock}         label="Drive Time"
            value={`${Math.round((overview?.totalDrivingSeconds ?? 0) / 60)}m`}
            color="text-warn-400" sub="Total monitored" />
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alert Trend */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-white">Alerts (Last 7 Days)</h2>
              <p className="text-xs text-gray-500 mt-0.5">By severity level</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-warn-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="high"   fill="#ef4444" radius={[4,4,0,0]} name="High" />
              <Bar dataKey="medium" fill="#f59e0b" radius={[4,4,0,0]} name="Medium" />
              <Bar dataKey="low"    fill="#10b981" radius={[4,4,0,0]} name="Low" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-white">Session Metrics</h2>
              <p className="text-xs text-gray-500 mt-0.5">All-time averages</p>
            </div>
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </div>

          <div className="space-y-4">
            {[
              { label: "Avg Fatigue Score", value: `${overview?.avgFatigueScore ?? 0}`, unit: "/100", color: "bg-warn-500" },
              { label: "Total Blinks", value: overview?.totalBlinks ?? 0, unit: "blinks", color: "bg-brand-500" },
              { label: "Total Yawns", value: overview?.totalYawns ?? 0, unit: "yawns", color: "bg-danger-500" },
              { label: "Sessions Monitored", value: overview?.totalSessions ?? 0, unit: "drives", color: "bg-success-500" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="flex items-center gap-4">
                <div className={`w-1.5 h-10 rounded-full ${color} flex-shrink-0`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-white font-mono">{value} <span className="text-xs text-gray-500 font-normal">{unit}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { to: "/monitor",   icon: Video,    label: "Live Monitor",    desc: "Start detection session",   color: "text-brand-400" },
          { to: "/sessions",  icon: Clock,    label: "Session History", desc: "Review past drives",        color: "text-success-400" },
          { to: "/analytics", icon: TrendingUp, label: "Analytics",    desc: "Trends & driver score",     color: "text-warn-400" },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to} className="glass-card-hover p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
