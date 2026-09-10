import { useState, useEffect } from "react";
import { User, Mail, Key, ShieldCheck, LogOut, Save, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatters";

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    createdAt: user?.createdAt || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || "",
        email: user.email || "",
        createdAt: user.createdAt || "",
      });
    }
  }, [user]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!profile.fullName.trim()) { toast.error("Full name cannot be empty"); return; }
    setSavingName(true);
    try {
      const { data } = await API.put("/api/auth/profile", { fullName: profile.fullName });
      if (data.success) {
        toast.success("Profile name updated successfully!");
        updateUser({ fullName: data.user.fullName });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile name");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmNewPassword } = passwordData;
    if (!currentPassword || !newPassword || !confirmNewPassword) { toast.error("Please fill out all password fields"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmNewPassword) { toast.error("New passwords do not match"); return; }
    setSavingPassword(true);
    try {
      const { data } = await API.put("/api/auth/profile", { currentPassword, newPassword });
      if (data.success) {
        toast.success("Password changed successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const labelClass = "block text-[11px] font-bold uppercase tracking-widest mb-1.5";

  return (
    <div className="app-page flex flex-col gap-6 max-w-4xl mx-auto pb-12 animate-slide-up">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-[28px] font-black flex items-center gap-2.5"
          style={{ color: "#1d1d1f", letterSpacing: "-0.03em" }}
        >
          <User size={24} style={{ color: "#4f46e5" }} />
          Account & Security
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#6e6e73" }}>
          Manage your personal details, email credentials, and security settings.
        </p>
      </div>

      {/* Identity Card */}
      <div
        className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6"
        style={{ border: "1px solid rgba(79,70,229,0.12)" }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md shadow-indigo-500/15 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
            }}
          >
            {getInitials(profile.fullName)}
          </div>

          <div>
            <h2
              className="text-xl sm:text-2xl font-extrabold"
              style={{ color: "#1d1d1f", letterSpacing: "-0.025em" }}
            >
              {profile.fullName || "User Account"}
            </h2>
            <p
              className="text-xs mt-1 flex items-center justify-center sm:justify-start gap-1.5 font-mono"
              style={{ color: "#6e6e73" }}
            >
              <Mail size={12} />
              {profile.email}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-3 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: "#f0fdf4", color: "#059669", border: "1px solid rgba(5,150,105,0.2)" }}
              >
                <ShieldCheck size={11} /> Active Account
              </span>
              {profile.createdAt && (
                <span className="text-[11px] font-mono" style={{ color: "#aeaeb2" }}>
                  Member since {formatDate(profile.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="profile-signout px-5 py-2.5 rounded-xl text-sm font-semibold active-press flex items-center gap-2 cursor-pointer flex-shrink-0"
          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
          onMouseLeave={e => (e.currentTarget.style.background = "#fef2f2")}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Info */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <h3
            className="text-[15px] font-bold mb-5 flex items-center gap-2"
            style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
          >
            <User size={17} style={{ color: "#4f46e5" }} />
            Personal Information
          </h3>

          <form onSubmit={handleUpdateName} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className={labelClass} style={{ color: "#aeaeb2" }}>Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full glass-input px-4 py-3 rounded-xl text-sm"
                style={{ color: "#1d1d1f" }}
                placeholder="Your Name"
                required
              />
            </div>

            <div>
              <label className={labelClass} style={{ color: "#aeaeb2" }}>Registered Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 rounded-xl text-sm font-mono cursor-not-allowed"
                style={{
                  background: "#f5f5f7",
                  border: "1px solid rgba(0,0,0,0.07)",
                  color: "#aeaeb2",
                }}
              />
              <p className="text-[11px] mt-1.5" style={{ color: "#aeaeb2" }}>
                Email is locked for account integrity and recovery security.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingName}
              className="app-action-primary w-full py-3 px-4 mt-auto text-white font-semibold text-sm rounded-xl shadow-sm shadow-indigo-500/20 active-press disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: "#4f46e5" }}
              onMouseEnter={e => !savingName && (e.currentTarget.style.background = "#3730a3")}
              onMouseLeave={e => !savingName && (e.currentTarget.style.background = "#4f46e5")}
            >
              {savingName ? "Updating..." : <><Save size={15} /><span>Update Name</span></>}
            </button>
          </form>
        </div>

        {/* Security & Password */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <h3
            className="text-[15px] font-bold mb-5 flex items-center gap-2"
            style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
          >
            <Key size={17} style={{ color: "#d97706" }} />
            Security & Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4 flex-1 flex flex-col">
            {[
              { label: "Current Password", name: "currentPassword", placeholder: "••••••••" },
              { label: "New Password", name: "newPassword", placeholder: "Min 8 characters" },
              { label: "Confirm New Password", name: "confirmNewPassword", placeholder: "••••••••" },
            ].map((field) => (
              <div key={field.name}>
                <label className={labelClass} style={{ color: "#aeaeb2" }}>{field.label}</label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordData[field.name]}
                    onChange={(e) => setPasswordData({ ...passwordData, [field.name]: e.target.value })}
                    className="w-full glass-input px-4 py-3 pl-10 rounded-xl text-sm"
                    style={{ color: "#1d1d1f" }}
                    placeholder={field.placeholder}
                  />
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#aeaeb2" }} />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={savingPassword}
              className="profile-password-submit w-full py-3 px-4 mt-auto font-semibold text-sm rounded-xl active-press disabled:opacity-50 cursor-pointer"
              style={{
                background: "#f5f5f7",
                color: "#1d1d1f",
                border: "1px solid rgba(0,0,0,0.10)",
              }}
              onMouseEnter={e => !savingPassword && (e.currentTarget.style.background = "#ebebeb")}
              onMouseLeave={e => !savingPassword && (e.currentTarget.style.background = "#f5f5f7")}
            >
              {savingPassword ? "Updating Password..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
