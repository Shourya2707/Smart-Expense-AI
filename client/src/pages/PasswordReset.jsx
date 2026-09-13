import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../services/api";

const PasswordReset = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const { data } = token
        ? await API.post("/api/auth/reset-password", { token, password })
        : await API.post("/api/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to process the request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px", background: "var(--bg)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "420px", padding: "32px 28px", background: "var(--surface)" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--ink)" }}>{token ? "Choose a new password" : "Reset your password"}</h1>
        <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: "8px 0 22px" }}>
          {token ? "Your reset link is single-use and expires shortly." : "If an account exists, instructions will be sent when email delivery is configured."}
        </p>
        {message && <div className="alert alert-success" style={{ marginBottom: "16px" }}>{message}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}
        {!message || token ? (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {!token && <input className="input" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
            {token && <input className="input" type="password" required minLength={8} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Working..." : token ? "Set password" : "Send reset instructions"}</button>
          </form>
        ) : null}
        <Link to="/login" style={{ display: "block", marginTop: "20px", color: "var(--ink-2)", fontSize: "13px" }}>Back to sign in</Link>
      </div>
    </div>
  );
};

export default PasswordReset;
