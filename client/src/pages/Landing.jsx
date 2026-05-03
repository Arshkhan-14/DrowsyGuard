import { Link } from "react-router-dom";
import { Shield, Eye, Bell, BarChart3, ArrowRight, CheckCircle2, Zap, Lock, Activity } from "lucide-react";

const features = [
  { icon: Eye, title: "Real-Time Detection", desc: "MediaPipe Face Mesh extracts 468 landmarks to calculate EAR, MAR, and head pose at up to 30 FPS." },
  { icon: Bell, title: "Smart Alert System", desc: "Layered severity alerts (Low / Medium / High) with sound alarms and browser notifications." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track blink rates, yawn frequency, drowsiness score trends, and driver safety score over time." },
  { icon: Lock, title: "Secure & Private", desc: "JWT auth, per-user adaptive thresholds, and session data stored securely in MongoDB." },
  { icon: Zap, title: "Ultra-Low Latency", desc: "WebSocket streaming pipeline processes frames in real-time via a dedicated Python AI service." },
  { icon: Activity, title: "Driver Scoring", desc: "Personalized fatigue scoring based on your historical sessions and alert patterns." },
];

const stats = [
  { label: "Detection Accuracy", value: "97%+" },
  { label: "Avg Latency", value: "<50ms" },
  { label: "Alert Levels", value: "3" },
  { label: "Landmarks Tracked", value: "468" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-glow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">DrowsyGuard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/register" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 text-center max-w-5xl mx-auto overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-500/30 bg-brand-950/50 text-brand-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
            AI-Powered Driver Safety System
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
            Stop Drowsy Driving
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
              Before It Happens
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time drowsiness detection using computer vision — analyzing eye closure, blink rate,
            yawning, and head pose to keep drivers safe on every journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary px-8 py-4 text-base">
              Start Free Monitoring <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-ghost border border-white/10 px-8 py-4 text-base">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="glass-card p-5 text-center">
              <p className="text-3xl font-bold text-white font-mono">{value}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Everything you need to drive safely</h2>
          <p className="text-gray-400">Production-grade detection pipeline with full analytics</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card-hover p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 max-w-3xl mx-auto text-center">
        <div className="glass-card p-10"
          style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(16,16,30,0.8) 100%)" }}>
          <Shield className="w-10 h-10 text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Ready to drive safely?</h2>
          <p className="text-gray-400 mb-6 text-sm">Free to use. No credit card required.</p>
          <Link to="/register" className="btn-primary px-8 py-4">
            Create Free Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} DrowsyGuard — AI Driver Safety System
      </footer>
    </div>
  );
}
