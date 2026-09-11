import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  ScanLine,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Receipt,
  RefreshCw,
} from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { onDataChanged } from "../utils/dataEvents";
import SummaryCard from "../components/SummaryCard";
import ExpenseModal from "../components/ExpenseModal";
import IncomeModal from "../components/IncomeModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
    monthlyIncomeExpense: [],
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all"); // all | expense | income

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [analyticsRes, expensesRes, incomeRes, insightsRes] = await Promise.allSettled([
        API.get("/api/analytics"),
        API.get("/api/expenses"),
        API.get("/api/income"),
        API.get("/api/ai/insights"),
      ]);

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.data.success) {
        setAnalytics(analyticsRes.value.data.data);
      }

      let expList = [];
      let incList = [];

      if (expensesRes.status === "fulfilled" && expensesRes.value.data.success) {
        expList = (expensesRes.value.data.data || []).map((e) => ({
          ...e,
          type: "expense",
        }));
      }

      if (incomeRes.status === "fulfilled" && incomeRes.value.data.success) {
        incList = (incomeRes.value.data.data || []).map((i) => ({
          ...i,
          type: "income",
        }));
      }

      // Combine and sort recent transactions by date descending
      const combined = [...expList, ...incList].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecentTransactions(combined.slice(0, 7));

      if (insightsRes.status === "fulfilled" && insightsRes.value.data.success) {
        setAiInsights(insightsRes.value.data.data || []);
      }
    } catch {
      toast.error("Failed to load dashboard data. Retrying...");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // The AI assistant (and other surfaces) can mutate data — refresh silently.
  useEffect(() => onDataChanged(() => fetchDashboardData(true)), [fetchDashboardData]);

  // Calculations
  const savingsRate = analytics.totalIncome > 0
    ? Math.max(0, Math.round(((analytics.totalIncome - analytics.totalExpenses) / analytics.totalIncome) * 100))
    : 0;

  // Filtered transactions for the ledger
  const displayedTransactions = recentTransactions.filter((t) => {
    if (activeFilter === "expense") return t.type === "expense";
    if (activeFilter === "income") return t.type === "income";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Top Header & Actions */}
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
              Financial Overview
            </h1>
            <button
              onClick={() => fetchDashboardData(true)}
              className="btn-icon"
              title="Refresh ledger"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
            </button>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
            Welcome back, {user?.fullName || "Portfolio Owner"}. Here is your verified cashflow telemetry.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/receipt-scanner" className="btn btn-secondary" style={{ height: "38px" }}>
            <ScanLine size={15} />
            <span>Scan Receipt</span>
          </Link>
          <button
            onClick={() => setIncomeModalOpen(true)}
            className="btn btn-secondary"
            style={{ height: "38px" }}
          >
            <Plus size={15} style={{ color: "var(--fin-green)" }} />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="btn btn-primary"
            style={{ height: "38px" }}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
      }}>
        <SummaryCard
          title="Net Liquidity"
          value={formatCurrency(analytics.currentBalance || 0)}
          icon={Wallet}
          iconColor="var(--ink)"
          iconBg="var(--bg-subtle)"
          trend="Current Net Balance"
          trendType={analytics.currentBalance >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          title="Total Inflow"
          value={formatCurrency(analytics.totalIncome || 0)}
          icon={TrendingUp}
          iconColor="var(--fin-green)"
          iconBg="var(--fin-green-bg)"
          trend="Gross Received"
          trendType="positive"
        />
        <SummaryCard
          title="Total Outflow"
          value={formatCurrency(analytics.totalExpenses || 0)}
          icon={TrendingDown}
          iconColor="var(--fin-red)"
          iconBg="var(--fin-red-bg)"
          trend="Total Spent"
          trendType="negative"
        />
        <SummaryCard
          title="Savings Rate"
          value={`${savingsRate}%`}
          icon={PiggyBank}
          iconColor="var(--fin-amber)"
          iconBg="var(--fin-amber-bg)"
          trend={savingsRate > 20 ? "Healthy liquidity buffer" : "Tight operating margin"}
          trendType={savingsRate > 20 ? "positive" : "neutral"}
        />
      </div>

      {/* Inline AI Financial Commentary (Quiet & High-Signal) */}
      <div className="card" style={{ padding: "18px 20px", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <div style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "var(--bg-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink)",
          }}>
            <Sparkles size={14} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-2)" }}>
            Financial Intelligence &amp; Observations
          </span>
        </div>

        {aiInsights.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {aiInsights.slice(0, 3).map((insight, idx) => (
              <div key={idx} className="insight-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div className={
                    insight.type === "warning"
                      ? "insight-dot-amber"
                      : insight.type === "success"
                      ? "insight-dot-green"
                      : "insight-dot-blue"
                  } />
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink)", marginBottom: "2px" }}>
                      {insight.title}
                    </h4>
                    <p style={{ fontSize: "12.5px", color: "var(--ink-3)", lineHeight: 1.5 }}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--ink-3)", lineHeight: 1.5 }}>
            Telemetry running smoothly. As you log additional transactions or scan vendor receipts, your AI assistant will surface category variance alerts here.
          </p>
        )}
      </div>

      {/* Middle Grid: Cashflow Chart & Recent Transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
        {/* Monthly Cashflow Chart */}
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <span className="section-label">Trajectory</span>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--ink)", marginTop: "2px" }}>
                Monthly Inflow vs Outflow
              </h2>
            </div>
            <Link to="/analytics" style={{ fontSize: "12.5px", color: "var(--ink)", fontWeight: "600", textDecoration: "underline" }}>
              Full Analytics →
            </Link>
          </div>

          <div style={{ width: "100%", height: "260px" }}>
            {analytics.monthlyIncomeExpense && analytics.monthlyIncomeExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyIncomeExpense} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(15, 23, 42, 0.03)" }}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    formatter={(val) => [formatCurrency(val), ""]}
                  />
                  <Bar dataKey="income" name="Inflow" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Outflow" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: "100%", padding: 0 }}>
                <Receipt size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
                <span style={{ fontSize: "13px" }}>No cashflow history yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions Ledger */}
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span className="section-label">Ledger</span>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--ink)", marginTop: "2px" }}>
                Recent Transactions
              </h2>
            </div>

            {/* Filter buttons */}
            <div style={{ display: "flex", gap: "4px", background: "var(--bg-subtle)", padding: "2px", borderRadius: "var(--r-sm)" }}>
              {["all", "expense", "income"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveFilter(mode)}
                  style={{
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: activeFilter === mode ? 600 : 500,
                    background: activeFilter === mode ? "var(--surface)" : "transparent",
                    color: activeFilter === mode ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: activeFilter === mode ? "var(--shadow-xs)" : "none",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0" }}>
              <div className="skeleton" style={{ height: "40px" }} />
              <div className="skeleton" style={{ height: "40px" }} />
              <div className="skeleton" style={{ height: "40px" }} />
            </div>
          ) : displayedTransactions.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Detail</th>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((tx) => {
                    const isExpense = tx.type === "expense";
                    return (
                      <tr key={tx._id}>
                        <td style={{ color: "var(--ink-3)", whiteSpace: "nowrap", fontSize: "12px" }}>
                          {formatDate(tx.date)}
                        </td>
                        <td style={{ fontWeight: "600", fontSize: "13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isExpense ? (
                              <ArrowDownRight size={14} style={{ color: "var(--fin-red)", flexShrink: 0 }} />
                            ) : (
                              <ArrowUpRight size={14} style={{ color: "var(--fin-green)", flexShrink: 0 }} />
                            )}
                            <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {tx.description || tx.source || "Transaction"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={isExpense ? "badge" : "badge badge-green"}>
                            {tx.category || tx.source || "General"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <span
                            className="font-mono"
                            style={{
                              fontWeight: "600",
                              color: isExpense ? "var(--fin-red)" : "var(--fin-green)",
                            }}
                          >
                            {isExpense ? "- " : "+ "}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "36px 16px" }}>
              <Receipt size={28} style={{ marginBottom: "8px", opacity: 0.5 }} />
              <p style={{ fontSize: "13px", color: "var(--ink-3)" }}>No transactions recorded yet.</p>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button onClick={() => setExpenseModalOpen(true)} className="btn btn-secondary" style={{ height: "32px", fontSize: "12px" }}>
                  + Expense
                </button>
                <button onClick={() => setIncomeModalOpen(true)} className="btn btn-secondary" style={{ height: "32px", fontSize: "12px" }}>
                  + Income
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals for Quick Add */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={async (payload) => {
          const { data } = await API.post("/api/expenses", payload);
          if (!data.success) throw new Error(data.message || "Expense could not be saved.");
          setExpenseModalOpen(false);
          fetchDashboardData(true);
          toast.success("Expense logged successfully");
        }}
      />
      <IncomeModal
        isOpen={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        onSave={async (payload) => {
          const { data } = await API.post("/api/income", payload);
          if (!data.success) throw new Error(data.message || "Income could not be saved.");
          setIncomeModalOpen(false);
          fetchDashboardData(true);
          toast.success("Income logged successfully");
        }}
      />
    </div>
  );
};

export default Dashboard;
