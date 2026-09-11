import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  RefreshCw,
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/formatters";
import { onDataChanged } from "../utils/dataEvents";
import SummaryCard from "../components/SummaryCard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const FIN_PALETTE = [
  "#0f172a", // slate-900
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#64748b", // slate-500
];

const Analytics = () => {
  const toast = useToast();
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
    totalTransactions: 0,
    categoryWiseExpense: [],
    monthlyIncomeExpense: [],
    highestExpenseCategory: null,
    highestIncomeSource: null,
  });
  const [insights, setInsights] = useState([]);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [analyticsRes, insightsRes] = await Promise.allSettled([
        API.get("/api/analytics"),
        API.get("/api/ai/insights"),
      ]);

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.data.success) {
        setData(analyticsRes.value.data.data);
      }
      if (insightsRes.status === "fulfilled" && insightsRes.value.data.success) {
        setInsights(insightsRes.value.data.data || []);
      }
    } catch {
      toast.error("Failed to load analytics engine.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // The AI assistant (and other surfaces) can mutate data — refresh silently.
  useEffect(() => onDataChanged(() => fetchAnalytics(true)), [fetchAnalytics]);

  // Derived trajectory for the AreaChart
  const trajectoryData = (data.monthlyIncomeExpense || []).map((m) => {
    const net = (m.income || 0) - (m.expense || 0);
    return {
      month: m.month,
      netCashflow: net,
      inflow: m.income || 0,
      outflow: m.expense || 0,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--ink)" }}>
              Financial Analytics &amp; Reports
            </h1>
            <button
              onClick={() => fetchAnalytics(true)}
              className="btn-icon"
              title="Refresh telemetry"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
            </button>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
            Deterministic cashflow modeling, category allocation, and intelligence
          </p>
        </div>
      </div>

      {/* Strategic Insights Banner */}
      <div className="card" style={{ padding: "20px 22px", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <div style={{
            width: "26px",
            height: "26px",
            borderRadius: "7px",
            background: "var(--bg-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink)",
          }}>
            <Sparkles size={15} />
          </div>
          <h2 style={{ fontSize: "13.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-2)" }}>
            Financial Observations
          </h2>
        </div>

        {insights.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {insights.map((item, idx) => (
              <div key={idx} className="insight-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div className={
                    item.type === "warning"
                      ? "insight-dot-amber"
                      : item.type === "success"
                      ? "insight-dot-green"
                      : "insight-dot-blue"
                  } />
                  <div>
                    <h3 style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--ink)", marginBottom: "3px" }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "var(--ink-3)", lineHeight: 1.5 }}>
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--ink-3)" }}>
            Analysis model calibrated. Log further data points to trigger high-resolution variance warnings.
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "16px",
      }}>
        <SummaryCard
          title="Gross Inflow"
          value={formatCurrency(data.totalIncome || 0)}
          icon={TrendingUp}
          iconColor="var(--fin-green)"
          iconBg="var(--fin-green-bg)"
          trend={data.highestIncomeSource ? `Top source: ${data.highestIncomeSource}` : "Total receipts"}
          trendType="positive"
        />
        <SummaryCard
          title="Gross Outflow"
          value={formatCurrency(data.totalExpenses || 0)}
          icon={TrendingDown}
          iconColor="var(--fin-red)"
          iconBg="var(--fin-red-bg)"
          trend={data.highestExpenseCategory ? `Top sink: ${data.highestExpenseCategory}` : "Total spent"}
          trendType="negative"
        />
        <SummaryCard
          title="Net Liquidity"
          value={formatCurrency(data.currentBalance || 0)}
          icon={Wallet}
          iconColor="var(--ink)"
          iconBg="var(--bg-subtle)"
          trend="Current reserve"
          trendType={data.currentBalance >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          title="Total Transactions"
          value={String(data.totalTransactions || 0)}
          icon={Activity}
          iconColor="var(--ink-3)"
          iconBg="var(--bg-subtle)"
          trend="Ledger operations"
          trendType="neutral"
        />
      </div>

      {/* Dual Column: Comparative Bar Chart & Category Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
        {/* Comparative Monthly Cashflow */}
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <BarChart3 size={16} style={{ color: "var(--ink-3)" }} />
            <div>
              <span className="section-label">Cash Inflow vs Outflow</span>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>Monthly Cashflow Delta</h3>
            </div>
          </div>

          <div style={{ width: "100%", height: "280px" }}>
            {data.monthlyIncomeExpense && data.monthlyIncomeExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyIncomeExpense} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(15, 23, 42, 0.03)" }}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    formatter={(val) => [formatCurrency(val), ""]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                  <Bar dataKey="income" name="Inflow" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" name="Outflow" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: "100%", padding: 0 }}>
                <span>No monthly cashflow data</span>
              </div>
            )}
          </div>
        </div>

        {/* Categorical Allocation Donut */}
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <PieIcon size={16} style={{ color: "var(--ink-3)" }} />
            <div>
              <span className="section-label">Categorical Breakdown</span>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>Expense Allocation by Category</h3>
            </div>
          </div>

          <div style={{ width: "100%", height: "280px" }}>
            {data.categoryWiseExpense && data.categoryWiseExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryWiseExpense}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {data.categoryWiseExpense.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={FIN_PALETTE[index % FIN_PALETTE.length]} stroke="var(--surface)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    formatter={(val) => [formatCurrency(val), "Allocation"]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: "100%", padding: 0 }}>
                <span>No categorical expense data recorded</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trajectory Area Chart */}
      <div className="card" style={{ padding: "22px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <LineIcon size={16} style={{ color: "var(--ink-3)" }} />
          <div>
            <span className="section-label">Temporal Drift</span>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>Net Monthly Cashflow Trajectory</h3>
          </div>
        </div>

        <div style={{ width: "100%", height: "260px" }}>
          {trajectoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netCashflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}
                  formatter={(val) => [formatCurrency(val), "Net Cashflow"]}
                />
                <Area
                  type="monotone"
                  dataKey="netCashflow"
                  name="Net Cashflow"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#netCashflowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: "100%", padding: 0 }}>
              <span>No trajectory data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
