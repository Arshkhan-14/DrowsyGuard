import { useEffect, useState } from "react";
import api from "../utils/api";
import { AlertLevelBadge } from "../components/ui";
import { Clock, ChevronDown, ChevronUp, Eye, Bell, Activity, Shield } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

function SessionRow({ session }) {
  const [expanded, setExpanded] = useState(false);
  const dur = session.durationSeconds;
  const durStr = `${Math.floor(dur / 60)}m ${dur % 60}s`;

  const score = session.driverScore ?? 100;
  const scoreColor = score >= 80 ? "text-success-400" : score >= 60 ? "text-warn-400" : "text-danger-400";

  return (
    <div className="glass-card overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-xl bg-brand-600/15 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {format(new Date(session.startedAt), "MMM d, yyyy · h:mm a")}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{durStr} · {session.totalAlerts} alerts</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className={clsx("text-lg font-bold font-mono", scoreColor)}>{score}</p>
            <p className="text-xs text-gray-600">score</p>
          </div>
          <div className={clsx("px-2 py-1 rounded-lg text-xs font-medium",
            session.status === "completed" ? "bg-success-500/15 text-success-400" : "bg-gray-500/15 text-gray-400")}>
            {session.status}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Duration",     value: durStr,                         icon: Clock },
              { label: "Total Alerts", value: session.totalAlerts,            icon: Bell },
              { label: "Avg EAR",      value: (session.avgEar || 0).toFixed(3), icon: Eye },
              { label: "Fatigue Score",value: `${session.fatigueScore || 0}/100`, icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-gray-500" />
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
                <p className="text-base font-bold text-white font-mono">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Low Alerts",    value: session.lowAlerts,    cls: "text-success-400" },
              { label: "Med. Alerts",   value: session.mediumAlerts, cls: "text-warn-400" },
              { label: "High Alerts",   value: session.highAlerts,   cls: "text-danger-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className={clsx("text-xl font-bold font-mono", cls)}>{value || 0}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    setLoading(true);
    api.get(`/sessions?page=${page}&limit=${LIMIT}`)
      .then((res) => {
        setSessions(res.data.sessions);
        setTotal(res.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Session History</h1>
        <p className="text-gray-400 text-sm mt-1">{total} total sessions recorded</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card h-20 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No sessions yet</p>
          <p className="text-gray-600 text-sm mt-1">Start a monitoring session from the Live Monitor page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => <SessionRow key={s._id} session={s} />)}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-ghost disabled:opacity-30">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / LIMIT)} className="btn-ghost disabled:opacity-30">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
