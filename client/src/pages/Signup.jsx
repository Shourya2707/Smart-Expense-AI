import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
  };

  // Password strength checks (server requires 8+ characters)
  const hasMinLen = form.password.length >= 8;
  const hasNumber = /\d/.test(form.password);
  const isMatch = form.password && form.password === form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasMinLen) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await API.post("/api/auth/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (data.success && data.token) {
        login(data.token, data.user);
        toast.success("Account created successfully! Welcome to SmartExpense AI.");
        navigate("/dashboard", { replace: true });
      } else {
        setError(data.message || "Failed to create account.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please check your information.";
      setError(msg);
    } finally {
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
      {/* Brand & header */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
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
          Create your account
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--ink-3)" }}>
          Set up your private financial workspace in 2 quick steps
        </p>
      </div>

      {/* Main card */}
      <div className="card" style={{
        width: "100%",
        maxWidth: "440px",
        padding: "32px 28px",
        background: "var(--surface)",
        position: "relative",
      }}>
        {/* Step indicator and progress bar */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Step {step} of 2: {step === 1 ? "Profile Identity" : "Security & Password"}
            </span>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--ink)" }}>
              {step === 1 ? "50%" : "100%"}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: step === 1 ? "50%" : "100%" }} />
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "20px" }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Identity */}
        {step === 1 && (
          <form onSubmit={handleNext} className="animate-slide-right" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label className="label" htmlFor="fullName">Full Name</label>
              <div style={{ position: "relative" }}>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoFocus
                  className="input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="e.g. Alex Morgan"
                  value={form.fullName}
                  onChange={handleChange}
                />
                <User size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="email">Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="alex@company.com"
                  value={form.email}
                  onChange={handleChange}
                />
                <Mail size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }} />
              </div>
              <p className="helper-text">You will use this address to log in and receive weekly digest reports.</p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "42px", marginTop: "6px" }}
            >
              Continue to Security <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* Step 2: Credentials */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="animate-slide-left" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label className="label" htmlFor="password">Create Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  className="input"
                  style={{ paddingLeft: "38px", paddingRight: "38px" }}
                  placeholder="At least 8 characters"
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

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  className="input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
                <Lock size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Password verification checklist */}
            <div style={{ background: "var(--bg-subtle)", padding: "10px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                Security Requirements
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: hasMinLen ? "var(--fin-green)" : "var(--ink-4)" }}>
                  <Check size={13} style={{ strokeWidth: hasMinLen ? 3 : 2 }} />
                  <span>At least 8 characters</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: hasNumber ? "var(--fin-green)" : "var(--ink-4)" }}>
                  <Check size={13} style={{ strokeWidth: hasNumber ? 3 : 2 }} />
                  <span>Includes at least one numeric digit</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: isMatch ? "var(--fin-green)" : "var(--ink-4)" }}>
                  <Check size={13} style={{ strokeWidth: isMatch ? 3 : 2 }} />
                  <span>Passwords match identically</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                style={{ flex: 1, height: "42px" }}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, height: "42px" }}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="spinner spinner-white" />
                    Creating account...
                  </span>
                ) : (
                  "Complete Setup"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer link */}
      <p style={{ marginTop: "24px", fontSize: "13.5px", color: "var(--ink-3)" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--ink)", fontWeight: "600", textDecoration: "underline" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Signup;
