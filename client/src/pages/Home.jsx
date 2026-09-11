import { Link } from "react-router-dom";
import { Zap, ArrowRight, ShieldCheck, TrendingUp, ScanLine, Layers, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/formatters";

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Top navigation */}
      <header style={{
        height: "64px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}>
            <Zap size={17} />
          </div>
          <span style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            SmartExpense<span style={{ color: "var(--ink-4)", fontWeight: "500", marginLeft: "2px" }}>AI</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ height: "36px", padding: "0 16px" }}>
              Open Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ height: "36px", padding: "0 14px" }}>
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary" style={{ height: "36px", padding: "0 16px" }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "80px 24px 60px",
          textAlign: "center",
        }}>
          {/* Subtle status chip */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "4px 12px",
            borderRadius: "999px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--ink-2)",
            marginBottom: "28px",
            boxShadow: "var(--shadow-xs)",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--fin-green)" }} />
            Zero-Slop Financial Accounting System v2.0
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 5.5vw, 58px)",
            fontWeight: "800",
            letterSpacing: "-0.035em",
            lineHeight: 1.12,
            color: "var(--ink)",
            maxWidth: "840px",
            margin: "0 auto 20px",
          }}>
            Personal finance with mathematical clarity.
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2vw, 19px)",
            color: "var(--ink-3)",
            maxWidth: "640px",
            margin: "0 auto 36px",
            lineHeight: 1.6,
          }}>
            Track every rupee across accounts, categorize cashflows in milliseconds, and extract receipts with vision models—free from bloated distractions.
          </p>

          {/* Action CTAs */}
          <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap", marginBottom: "60px" }}>
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="btn btn-primary"
              style={{ height: "46px", padding: "0 24px", fontSize: "15px" }}
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Tracking Free"} <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="btn btn-secondary"
              style={{ height: "46px", padding: "0 22px", fontSize: "15px" }}
            >
              View Live Demo
            </Link>
          </div>

          {/* Interactive Preview Mockup Card */}
          <div className="card" style={{
            maxWidth: "920px",
            margin: "0 auto",
            padding: "24px",
            background: "var(--surface)",
            textAlign: "left",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-sm)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <span className="section-label">Aggregated Portfolio Liquidity</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginTop: "4px" }}>
                  <span className="metric-value" style={{ fontSize: "32px" }}>{formatCurrency(142850)}</span>
                  <span className="badge badge-green">+14.2% this month</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span className="badge">INR Core</span>
                <span className="badge badge-green" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <ShieldCheck size={12} /> Verified
                </span>
              </div>
            </div>

            {/* Sample Table Preview */}
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ background: "transparent" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category / Source</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: "var(--ink-3)", fontFamily: "monospace" }}>11 Sep 2026</td>
                    <td style={{ fontWeight: "600" }}>Monthly Tech Retainer</td>
                    <td><span className="badge badge-green">Salary &amp; Retainer</span></td>
                    <td style={{ textAlign: "right", color: "var(--fin-green)", fontWeight: "600" }}>+ ₹1,20,000.00</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--ink-3)", fontFamily: "monospace" }}>10 Sep 2026</td>
                    <td style={{ fontWeight: "600" }}>Cloud Server Infrastructure</td>
                    <td><span className="badge">Bills &amp; Ops</span></td>
                    <td style={{ textAlign: "right", color: "var(--fin-red)", fontWeight: "600" }}>- ₹4,890.00</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--ink-3)", fontFamily: "monospace" }}>08 Sep 2026</td>
                    <td style={{ fontWeight: "600" }}>Client Working Lunch</td>
                    <td><span className="badge">Food &amp; Dining</span></td>
                    <td style={{ textAlign: "right", color: "var(--fin-red)", fontWeight: "600" }}>- ₹1,650.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pillars / Feature Grid */}
        <section style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <span className="section-label">Engineering Discipline</span>
            <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--ink)", marginTop: "6px" }}>
              Built for speed, confidence, and auditability
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div className="card" style={{ padding: "26px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink)",
                marginBottom: "18px",
              }}>
                <TrendingUp size={20} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--ink)", marginBottom: "8px" }}>
                Zero AI Slop Design
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--ink-3)", lineHeight: 1.6 }}>
                No neon gradients, no chatty conversational bots, and no bloated dashboards. Pure high-density financial data designed for clarity.
              </p>
            </div>

            <div className="card" style={{ padding: "26px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink)",
                marginBottom: "18px",
              }}>
                <ScanLine size={20} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--ink)", marginBottom: "8px" }}>
                Autonomous Receipt Parsing
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--ink-3)", lineHeight: 1.6 }}>
                Drop any receipt or invoice. Vision AI extracts merchant, items, taxes, date, and category in seconds with mechanical verification.
              </p>
            </div>

            <div className="card" style={{ padding: "26px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink)",
                marginBottom: "18px",
              }}>
                <Layers size={20} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--ink)", marginBottom: "8px" }}>
                Ledger-Grade Precision
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--ink-3)", lineHeight: 1.6 }}>
                Full inline editing, category filtering, instant sorting, and monthly cashflow aggregation calibrated for the Indian Rupee (₹).
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal footer */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "24px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ink-3)" }}>
          <span>SmartExpense AI</span>
          <span>•</span>
          <span>Light-only Fintech System</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "var(--ink-3)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={13} style={{ color: "var(--fin-green)" }} /> TLS 1.3 Encrypted
          </span>
          <span>© 2026 SmartExpense AI</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
