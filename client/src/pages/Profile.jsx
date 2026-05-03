import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";
import { User, Mail, SlidersHorizontal, Lock, Shield, Save, Loader2 } from "lucide-react";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    earThreshold: user?.earThreshold || 0.22,
    marThreshold: user?.marThreshold || 0.65,
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const res = await api.patch("/users/profile", {
        name: profileForm.name,
        earThreshold: parseFloat(profileForm.earThreshold),
        marThreshold: parseFloat(profileForm.marThreshold),
      });
      updateUser(res.data.user);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error("Passwords do not match");
    setLoadingPw(true);
    try {
      await api.patch("/users/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Password updated!");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingPw(false);
    }
  };

  const scoreColor = (user?.driverScore ?? 100) >= 80 ? "text-success-400" : (user?.driverScore ?? 100) >= 60 ? "text-warn-400" : "text-danger-400";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile & Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account and detection thresholds</p>
      </div>

      {/* User Card */}
      <div className="glass-card p-6 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(16,16,30,0.9) 100%)" }}>
        <div className="w-16 h-16 rounded-2xl bg-brand-700 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-glow">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-white truncate">{user?.name}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">{user?.totalSessions || 0} sessions</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">{user?.totalAlerts || 0} alerts</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-3xl font-bold font-mono ${scoreColor}`}>{user?.driverScore ?? 100}</p>
          <p className="text-xs text-gray-500">driver score</p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileSave} className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-white">Account Info</h2>
        </div>

        <div>
          <label className="input-label">Full Name</label>
          <input type="text" required className="input-field"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
        </div>

        <div>
          <label className="input-label">Email Address</label>
          <input type="email" disabled className="input-field opacity-50 cursor-not-allowed" value={user?.email || ""} />
          <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
        </div>

        {/* Adaptive Thresholds */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-brand-400" />
            <h3 className="font-medium text-white text-sm">Detection Thresholds</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Calibrate these to your facial geometry for more accurate detection.</p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="input-label">EAR Threshold</label>
                <span className="text-xs font-mono text-brand-400">{profileForm.earThreshold}</span>
              </div>
              <input type="range" min="0.10" max="0.40" step="0.01"
                className="w-full accent-brand-500"
                value={profileForm.earThreshold}
                onChange={(e) => setProfileForm({ ...profileForm, earThreshold: e.target.value })} />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0.10 (smaller eyes)</span><span>0.40 (larger eyes)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="input-label">MAR Threshold</label>
                <span className="text-xs font-mono text-warn-400">{profileForm.marThreshold}</span>
              </div>
              <input type="range" min="0.40" max="0.90" step="0.01"
                className="w-full accent-warn-500"
                value={profileForm.marThreshold}
                onChange={(e) => setProfileForm({ ...profileForm, marThreshold: e.target.value })} />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0.40 (less sensitive)</span><span>0.90 (more sensitive)</span>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loadingProfile} className="btn-primary w-full">
          {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loadingProfile ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Password Form */}
      <form onSubmit={handlePasswordChange} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-white">Change Password</h2>
        </div>

        {[
          { id: "currentPassword", label: "Current Password", placeholder: "Your current password" },
          { id: "newPassword",     label: "New Password",     placeholder: "Min 6 characters" },
          { id: "confirm",         label: "Confirm New Password", placeholder: "Repeat new password" },
        ].map(({ id, label, placeholder }) => (
          <div key={id}>
            <label className="input-label">{label}</label>
            <input type="password" required className="input-field" placeholder={placeholder}
              value={pwForm[id]}
              onChange={(e) => setPwForm({ ...pwForm, [id]: e.target.value })} />
          </div>
        ))}

        <button type="submit" disabled={loadingPw} className="btn-primary w-full">
          {loadingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {loadingPw ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
