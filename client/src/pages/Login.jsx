import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate("/dashboard", { replace: true }); }, [isAuthenticated, navigate]);

  const handleChange = (e) => { setFormData((current) => ({ ...current, [e.target.name]: e.target.value })); setError(""); };
  const validate = () => {
    if (!formData.email.trim() || !formData.password) return "Enter your email and password to continue.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Enter a valid email address.";
    return "";
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/login", { email: formData.email.trim().toLowerCase(), password: formData.password });
      if (!data.success) throw new Error(data.message || "Login failed.");
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.fullName}!`);
      navigate("/dashboard", { replace: true });
    } catch (err) { const message = err.response?.data?.message || err.message || "Login failed. Please try again."; setError(message); toast.error(message); } finally { setLoading(false); }
  };

  return <div className="auth-page"><div className="auth-orb auth-orb-left" /><div className="auth-orb auth-orb-right" />
    <Link to="/" className="auth-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>SmartExpense <em>AI</em></span></Link>
    <main className="auth-layout"><section className="auth-intro"><span className="eyebrow"><span className="live-dot" /> Personal finance, with perspective</span><h1>Make room for<br /><span>what matters.</span></h1><p>Understand your money without turning it into another thing to manage.</p><div className="auth-proof"><span><strong>01</strong> One calm view of your month</span><span><strong>02</strong> Intelligent signals, not noise</span><span><strong>03</strong> Your data stays yours</span></div></section>
      <section className="auth-card"><div className="auth-card-heading"><div className="auth-icon"><Sparkles size={20} /></div><div><p className="auth-kicker">Welcome back</p><h2>Sign in to SmartExpense</h2><p>Pick up where you left off.</p></div></div>{error && <div className="form-alert" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form"><label>Email address<input id="login-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@domain.com" autoComplete="email" required /><Mail size={16} aria-hidden="true" /></label><label>Password<div className="field-with-action"><input id="login-password" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" required /><LockKeyhole size={16} aria-hidden="true" /><button type="button" className="field-action" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><button className="auth-submit" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Signing in…</> : <>Continue <ArrowRight size={16} /></>}</button></form><p className="auth-switch">New to SmartExpense? <Link to="/signup">Create a free account</Link></p>
      </section></main><footer className="auth-footer"><span>Private by design</span><span>SmartExpense AI · {new Date().getFullYear()}</span></footer>
  </div>;
};

export default Login;
