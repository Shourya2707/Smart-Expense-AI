import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import API, { googleAuthUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    const code = new URLSearchParams(location.search).get("error");
    const messages = {
      account_exists: "An account already exists for this Google email. Sign in with your password, then connect Google from Profile.",
      oauth_unavailable: "Google sign-in is not configured on this deployment yet.",
      oauth_state_mismatch: "Google sign-in expired. Please try again.",
      oauth_failed: "Google sign-in failed. Please try again.",
      oauth_email_mismatch: "The Google email must match your SmartExpense account before it can be linked.",
      google_already_linked: "That Google account is already linked to another SmartExpense account.",
      oauth_login_required: "Sign in first, then connect Google from Profile.",
    };
    if (code) setError(messages[code] || "Unable to complete Google sign-in.");
  }, [location.search]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await API.post("/api/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      if (data.success && data.user) {
        login(data.user);
        toast.success(`Welcome back, ${data.user.fullName || "User"}!`);
        navigate(from, { replace: true });
      } else {
        setError(data.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to sign in. Please verify your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const DEMO_EMAIL = "demo@smartexpense.app";
  const DEMO_PASSWORD = "Demo@12345";

  const handleDemoLogin = async () => {
    setForm({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    setLoading(true);
    setError("");
    try {
      const { data } = await API.post("/api/auth/login", {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (data.success && data.user) {
        login(data.user);
        toast.success("Signed in with demo account");
        navigate(from, { replace: true });
      }
    } catch {
      // Demo account missing (fresh database) — create it, then sign in.
      try {
        const reg = await API.post("/api/auth/register", {
          fullName: "Demo User",
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (reg.data.success && reg.data.user) {
          login(reg.data.user);
          toast.success("Demo account created and signed in");
          navigate(from, { replace: true });
          return;
        }
      } catch (regError) {
        if (regError.response?.status === 400 && /already registered/i.test(regError.response?.data?.message || "")) {
          // Exists but the first login failed — surface the real error.
        } else {
          toast.error(regError.response?.data?.message || "Could not create the demo account.");
          setLoading(false);
          return;
        }
      }
      toast.error("Demo sign-in failed. Run `npm run seed` in server/ to restore it.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: "var(--bg)",
    }}>
      {/* Brand logo & header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit", marginBottom: "16px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: "var(--shadow-sm)",
          }}>
            <Zap size={19} />
          </div>
          <span style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.03em" }}>
            SmartExpense<span style={{ color: "var(--ink-4)", fontWeight: "500", marginLeft: "2px" }}>AI</span>
          </span>
        </Link>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "6px" }}>
          Sign in to your account
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--ink-3)" }}>
          Clear, real-time control over cashflow and analytics
        </p>
      </div>

      {/* Main card */}
      <div className="card" style={{
        width: "100%",
        maxWidth: "420px",
        padding: "32px 28px",
        background: "var(--surface)",
      }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "20px" }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Email */}
          <div>
            <label className="label" htmlFor="email">Email Address</label>
            <div style={{ position: "relative" }}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                style={{ paddingLeft: "38px" }}
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
              />
              <Mail size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label className="label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: "12px", color: "var(--ink-3)" }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="input"
                style={{ paddingLeft: "38px", paddingRight: "38px" }}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
              <Lock size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--ink-4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", height: "42px", marginTop: "4px" }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="spinner spinner-white" />
                Signing in...
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Sign In <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>

        <div style={{ margin: "22px 0" }} className="divider-text">
          or continue with
        </div>

        {/* SSO & Demo options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <a href={googleAuthUrl} className="sso-btn" style={{ textDecoration: "none" }}>
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </a>
            <button
              type="button"
              className="sso-btn"
              onClick={() => toast.info("GitHub sign-in will be added after Google OAuth is stable.")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "100%", fontSize: "12.5px" }}
            onClick={handleDemoLogin}
          >
            Quick Fill Demo Account
          </button>
        </div>
      </div>

      {/* Footer link */}
      <p style={{ marginTop: "24px", fontSize: "13.5px", color: "var(--ink-3)" }}>
        Don&apos;t have an account?{" "}
        <Link to="/signup" style={{ color: "var(--ink)", fontWeight: "600", textDecoration: "underline" }}>
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Login;
