import { useState } from "react";
import {
  User,
  Shield,
  Sliders,
  Cpu,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Calendar,
} from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatters";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("workspace"); // workspace | security | preferences | usage

  // Workspace form
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [savingName, setSavingName] = useState(false);

  // Security form
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [securityError, setSecurityError] = useState("");

  // Preferences (snappy toggles)
  const [preferences, setPreferences] = useState({
    emailDigest: true,
    anomalyAlerts: true,
    soundFeedback: false,
    strictRounding: true,
  });

  const togglePref = (key) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.info(`Updated preference`);
      return updated;
    });
  };

  // Update profile full name
  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    setSavingName(true);
    try {
      const { data } = await API.put("/api/auth/profile", { fullName: fullName.trim() });
      if (data.success) {
        updateUser({ fullName: fullName.trim() });
        toast.success("Profile name updated successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile name");
    } finally {
      setSavingName(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSecurityError("");

    if (!passwords.currentPassword || !passwords.newPassword) {
      setSecurityError("Please fill in both current and new password.");
      return;
    }
    if (passwords.newPassword.length < 6) {
      setSecurityError("New password must be at least 6 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setSecurityError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await API.put("/api/auth/profile", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });

      if (data.success) {
        toast.success("Password changed successfully");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update password. Check current password.";
      setSecurityError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--ink)" }}>
          Settings &amp; Workspace
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
          Manage your account identity, encryption credentials, and system preferences
        </p>
      </div>

      {/* Main Settings Split: Navigation List & Detail Panel */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr)) 2.5fr",
        gap: "24px",
        alignItems: "start",
      }}>
        {/* Left Nav List */}
        <div className="card" style={{ padding: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              onClick={() => setActiveTab("workspace")}
              className={`tab-btn ${activeTab === "workspace" ? "active" : ""}`}
            >
              <User size={16} />
              <span>Workspace &amp; Identity</span>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
            >
              <Shield size={16} />
              <span>Security &amp; Credentials</span>
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`tab-btn ${activeTab === "preferences" ? "active" : ""}`}
            >
              <Sliders size={16} />
              <span>Telemetry &amp; Alerts</span>
            </button>
            <button
              onClick={() => setActiveTab("usage")}
              className={`tab-btn ${activeTab === "usage" ? "active" : ""}`}
            >
              <Cpu size={16} />
              <span>AI Engine &amp; Usage</span>
            </button>
          </div>

          <div className="divider" style={{ margin: "14px 0" }} />

          <button
            onClick={logout}
            className="tab-btn"
            style={{ color: "var(--fin-red)" }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Right Detail Panel */}
        <div className="card" style={{ padding: "28px" }}>
          {/* TAB 1: WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)" }}>
                  Workspace Identity
                </h2>
                <p style={{ fontSize: "13px", color: "var(--ink-3)", marginTop: "2px" }}>
                  Your primary profile details across financial reports and exports.
                </p>
              </div>

              <form onSubmit={handleUpdateName} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label className="label" htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Registered Email</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      readOnly
                      disabled
                      className="input"
                      style={{ background: "var(--bg-subtle)", color: "var(--ink-3)", paddingLeft: "36px" }}
                      value={user?.email || ""}
                    />
                    <Mail size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
                  </div>
                  <p className="helper-text">Email address is tied to your cryptographic ledger authentication.</p>
                </div>

                <div>
                  <label className="label">Member Since</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ink-2)", padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
                    <Calendar size={14} style={{ color: "var(--ink-3)" }} />
                    <span>{formatDate(user?.createdAt || new Date())}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingName || fullName === user?.fullName}
                  >
                    {savingName ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === "security" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)" }}>
                  Security &amp; Credentials
                </h2>
                <p style={{ fontSize: "13px", color: "var(--ink-3)", marginTop: "2px" }}>
                  Update your authentication key and manage access credentials.
                </p>
              </div>

              {securityError && (
                <div className="alert alert-error">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{securityError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label className="label" htmlFor="cur-pass">Current Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="cur-pass"
                      type="password"
                      required
                      className="input"
                      style={{ paddingLeft: "36px" }}
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    />
                    <Lock size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="label" htmlFor="new-pass">New Password</label>
                    <input
                      id="new-pass"
                      type="password"
                      required
                      className="input"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="conf-pass">Confirm Password</label>
                    <input
                      id="conf-pass"
                      type="password"
                      required
                      className="input"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PREFERENCES & TOGGLES */}
          {activeTab === "preferences" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)" }}>
                  Telemetry &amp; Alerts
                </h2>
                <p style={{ fontSize: "13px", color: "var(--ink-3)", marginTop: "2px" }}>
                  Configure notification thresholds and accounting precision.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Toggle Item 1 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div>
                    <h4 style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--ink)" }}>
                      Weekly Financial Summary Digest
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "2px" }}>
                      Send an encrypted weekly cashflow digest every Monday morning.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref("emailDigest")}
                    className={`toggle ${preferences.emailDigest ? "is-on" : ""}`}
                    aria-label="Toggle weekly digest"
                  >
                    <div className="thumb" />
                  </button>
                </div>

                {/* Toggle Item 2 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div>
                    <h4 style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--ink)" }}>
                      Anomaly &amp; Spike Alerts
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "2px" }}>
                      Surface high-priority notices whenever an expense exceeds ₹5,000 or category baseline by 40%.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref("anomalyAlerts")}
                    className={`toggle ${preferences.anomalyAlerts ? "is-on" : ""}`}
                    aria-label="Toggle anomaly alerts"
                  >
                    <div className="thumb" />
                  </button>
                </div>

                {/* Toggle Item 3 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  <div>
                    <h4 style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--ink)" }}>
                      Strict Ledger Rounding
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "2px" }}>
                      Enforce two decimal digits (₹.00) precision on all ledger columns and exports.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref("strictRounding")}
                    className={`toggle ${preferences.strictRounding ? "is-on" : ""}`}
                    aria-label="Toggle strict rounding"
                  >
                    <div className="thumb" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: USAGE & AI ENGINE */}
          {activeTab === "usage" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)" }}>
                  AI Engine &amp; Telemetry
                </h2>
                <p style={{ fontSize: "13px", color: "var(--ink-3)", marginTop: "2px" }}>
                  Status of underlying vision models and database telemetry.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ padding: "14px", background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
                  <span className="section-label">Vision Parsing Engine</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                    <CheckCircle2 size={15} style={{ color: "var(--fin-green)" }} />
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--ink)" }}>Groq Llama (LangChain agent)</span>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-3)", marginTop: "4px", display: "block" }}>
                    Sub-second invoice extraction
                  </span>
                </div>

                <div style={{ padding: "14px", background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
                  <span className="section-label">Account Tier</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                    <span className="badge badge-green">Enterprise Founder</span>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-3)", marginTop: "4px", display: "block" }}>
                    Unlimited receipts &amp; analytics
                  </span>
                </div>
              </div>

              <div style={{ padding: "14px", background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
                <span className="section-label">Security Protocol</span>
                <p style={{ fontSize: "12.5px", color: "var(--ink-2)", marginTop: "6px" }}>
                  All ledger mutations are cryptographically mapped to your Bearer JWT token session. Data remains private and strictly isolated.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
