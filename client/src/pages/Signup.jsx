import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const Signup = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate("/dashboard", { replace: true }); }, [isAuthenticated, navigate]);
  const handleChange = (e) => { setFormData((current) => ({ ...current, [e.target.name]: e.target.value })); setError(""); };
  const validate = () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) return "Complete every field to create your account.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Enter a valid email address.";
    if (formData.password.length < 8) return "Use at least 8 characters for your password.";
    if (formData.password !== formData.confirmPassword) return "Your passwords do not match.";
    return "";
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const { data } = await API.post("/api/auth/register", { fullName: formData.fullName.trim(), email: formData.email.trim().toLowerCase(), password: formData.password });
      if (!data.success) throw new Error(data.message || "Registration failed.");
      if (data.token && data.user) { login(data.token, data.user); toast.success(`Welcome to SmartExpense AI, ${data.user.fullName}!`); navigate("/dashboard", { replace: true }); }
      else { toast.success("Account created. Please sign in."); navigate("/login", { replace: true }); }
    } catch (err) { const message = err.response?.data?.message || err.message || "Unable to create your account."; setError(message); toast.error(message); } finally { setLoading(false); }
  };

  return <div className="auth-page"><div className="auth-orb auth-orb-left" /><div className="auth-orb auth-orb-right" />
    <Link to="/" className="auth-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>SmartExpense <em>AI</em></span></Link>
    <main className="auth-layout"><section className="auth-intro"><span className="eyebrow"><span className="live-dot" /> A better relationship with money</span><h1>Your month,<br /><span>in perspective.</span></h1><p>Set up a financial workspace that makes the next good decision feel obvious.</p><div className="auth-proof"><span><strong>01</strong> Track the full picture</span><span><strong>02</strong> Learn from your patterns</span><span><strong>03</strong> Start with one small step</span></div></section>
      <section className="auth-card"><div className="auth-card-heading"><div className="auth-icon"><Sparkles size={20} /></div><div><p className="auth-kicker">Start fresh</p><h2>Create your workspace</h2><p>It only takes a minute to get set up.</p></div></div>{error && <div className="form-alert" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form"><label>Full name<div className="field-with-action"><input id="signup-fullname" type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Alex Morgan" autoComplete="name" required /><UserRound size={16} aria-hidden="true" /></div></label><label>Email address<div className="field-with-action"><input id="signup-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@domain.com" autoComplete="email" required /><Mail size={16} aria-hidden="true" /></div></label><label>Password<div className="field-with-action"><input id="signup-password" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="At least 8 characters" autoComplete="new-password" required /><LockKeyhole size={16} aria-hidden="true" /><button type="button" className="field-action" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><label>Confirm password<div className="field-with-action"><input id="signup-confirm-password" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat your password" autoComplete="new-password" required /><LockKeyhole size={16} aria-hidden="true" /><button type="button" className="field-action" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><button className="auth-submit" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Creating account…</> : <>Create account <ArrowRight size={16} /></>}</button></form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </section></main><footer className="auth-footer"><span>Private by design</span><span>SmartExpense AI · {new Date().getFullYear()}</span></footer>
  </div>;
};

export default Signup;
