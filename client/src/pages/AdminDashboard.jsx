import { useState, useEffect, useCallback } from "react";
import {
  Activity, Cpu, AlertCircle, RefreshCw, Gauge, Zap, Server,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import SummaryCard from "../components/SummaryCard";

const AdminDashboard = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState([]);
  const [tools, setTools] = useState([]);
  const [errors, setErrors] = useState([]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [overviewRes, seriesRes, toolsRes, errorsRes] = await Promise.allSettled([
        API.get("/api/admin/overview"),
        API.get("/api/admin/series?days=14"),
        API.get("/api/admin/tools"),
        API.get("/api/admin/errors"),
      ]);
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value.data.data);
      if (seriesRes.status === "fulfilled") setSeries(seriesRes.value.data.data || []);
      if (toolsRes.status === "fulfilled") setTools(toolsRes.value.data.data || []);
      if (errorsRes.status === "fulfilled") setErrors(errorsRes.value.data.data || []);
    } catch {
      toast.error("Failed to load observability data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  const req = overview?.requests || {};
  const ai = overview?.ai || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--ink)" }}>Observability</h1>
            <button onClick={() => fetchData(true)} className="btn-icon" title="Refresh telemetry" disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
            </button>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 2 }}>
            Request traffic, AI usage, and tool health across the platform
          </p>
        </div>
        <span
          title={ai.llmConfigured ? "Groq API key configured" : "No GROQ_API_KEY — assistant runs in offline fallback mode"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11.5, fontWeight: 700, padding: "6px 12px", borderRadius: "var(--r-full)",
            background: ai.llmConfigured ? "var(--fin-green-bg)" : "var(--fin-amber-bg)",
            color: ai.llmConfigured ? "var(--fin-green)" : "var(--fin-amber)",
            border: `1px solid ${ai.llmConfigured ? "var(--fin-green-border)" : "#fde68a"}`,
          }}
        >
          <Zap size={12} />
          {ai.llmConfigured ? `LLM online · ${ai.textModel}` : "LLM offline · fallback mode"}
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        <SummaryCard
          title="API Requests (24h)"
          value={String(req.last24h ?? 0)}
          icon={Server}
          iconColor="var(--ink)"
          iconBg="var(--bg-subtle)"
          trend={`${req.total ?? 0} total logged`}
          trendType="neutral"
        />
        <SummaryCard
          title="Error Rate"
          value={`${req.errorRate ?? 0}%`}
          icon={AlertCircle}
          iconColor={(req.errorRate ?? 0) > 5 ? "var(--fin-red)" : "var(--fin-green)"}
          iconBg={(req.errorRate ?? 0) > 5 ? "var(--fin-red-bg)" : "var(--fin-green-bg)"}
          trend={`${req.errors ?? 0} failed requests`}
          trendType={(req.errorRate ?? 0) > 5 ? "negative" : "positive"}
        />
        <SummaryCard
          title="API Latency"
          value={`${req.p95LatencyMs ?? 0} ms`}
          icon={Gauge}
          iconColor="var(--ink)"
          iconBg="var(--bg-subtle)"
          trend={`avg ${req.avgLatencyMs ?? 0} ms · p95 shown`}
          trendType="neutral"
        />
        <SummaryCard
          title="AI Runs"
          value={String(ai.runs ?? 0)}
          icon={Cpu}
          iconColor="var(--ink)"
          iconBg="var(--bg-subtle)"
          trend={`${ai.successRate ?? 0}% success · ${Number(ai.tokens ?? 0).toLocaleString("en-IN")} tokens`}
          trendType={(ai.successRate ?? 0) >= 95 ? "positive" : "negative"}
        />
      </div>

      {/* Traffic + AI usage chart */}
      <div className="card" style={{ padding: "22px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Activity size={16} style={{ color: "var(--ink-3)" }} />
          <div>
            <span className="section-label">Traffic & AI usage</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Last 14 days</h3>
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: "var(--ink-3)", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="requests" name="API requests" stroke="#0f172a" strokeWidth={2} fill="url(#reqGrad)" />
                <Area type="monotone" dataKey="aiRuns" name="AI runs" stroke="#3b82f6" strokeWidth={2} fill="url(#aiGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: "100%", padding: 0 }}><span>No traffic recorded yet</span></div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20 }}>
        {/* Tool health */}
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <span className="section-label">Agent tools</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Tool call health</h3>
          </div>
          {tools.length > 0 ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tools} layout="vertical" margin={{ top: 0, right: 12, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="tool" width={110} tick={{ fill: "var(--ink-3)", fontSize: 10.5 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="calls" name="Calls" fill="#0f172a" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <Cpu size={26} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No tool calls recorded yet. Chat with the assistant to generate data.</p>
            </div>
          )}
        </div>

        {/* Recent AI errors */}
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <span className="section-label">Reliability</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Recent AI errors</h3>
          </div>
          {errors.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {errors.map((e, idx) => (
                <div key={idx} style={{ padding: "9px 12px", borderRadius: "var(--r-sm)", background: "var(--fin-red-bg)", border: "1px solid var(--fin-red-border)" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fin-red)" }}>
                    {e.feature}{e.tool_name ? ` · ${e.tool_name}` : ""} — {e.latency_ms}ms
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.45 }}>{e.error || "Unknown error"}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 2 }}>{e.created_at}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <AlertCircle size={26} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No AI errors recorded. Clean runway.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
