import { useState, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  ArrowRight,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Scan,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import SummaryCard from "../components/SummaryCard";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";

const Dashboard = () => {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoadingAnalytics(true);
    setLoadingInsights(true);

    try {
      const analyticsRes = await API.get("/api/analytics");
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics on dashboard:", error);
    } finally {
      setLoadingAnalytics(false);
    }

    try {
      const insightsRes = await API.get("/api/ai/gemini-insights");
      if (insightsRes.data.success && Array.isArray(insightsRes.data.data)) {
        setInsights(insightsRes.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch AI insights on dashboard:", error);
    } finally {
      setLoadingInsights(false);
    }

    try {
      const [expensesRes, incomeRes] = await Promise.all([
        API.get("/api/expenses"),
        API.get("/api/income"),
      ]);

      const expenses = (expensesRes.data.data || []).map((e) => ({
        ...e,
        type: "expense",
        title: e.description,
        subtitle: e.category,
      }));

      const incomes = (incomeRes.data.data || []).map((i) => ({
        ...i,
        type: "income",
        title: i.source,
        subtitle: "Income Stream",
      }));

      const combined = [...expenses, ...incomes]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      setRecentTransactions(combined);
    } catch (error) {
      console.error("Failed to fetch recent transactions:", error);
    }
  };

  const totalIncome = analytics?.totalIncome || 0;
  const totalExpenses = analytics?.totalExpenses || 0;
  const currentBalance = analytics?.currentBalance || 0;
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  const summaryData = [
    {
      title: "Current Balance",
      amount: formatCurrency(currentBalance),
      icon: <Wallet size={18} />,
      colorClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
      trend: "Net Assets",
      trendType: "neutral",
    },
    {
      title: "Total Inflow",
      amount: formatCurrency(totalIncome),
      icon: <TrendingUp size={18} />,
      colorClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
      trend: "+Earned",
      trendType: "positive",
    },
    {
      title: "Total Outflow",
      amount: formatCurrency(totalExpenses),
      icon: <TrendingDown size={18} />,
      colorClass: "bg-rose-50 text-rose-600 border-rose-100",
      trend: "-Spent",
      trendType: "negative",
    },
    {
      title: "Net Savings",
      amount: formatCurrency(savings),
      icon: <PiggyBank size={18} />,
      colorClass: "bg-sky-50 text-sky-600 border-sky-100",
      trend: `${savingsRate}% rate`,
      trendType: savings >= 0 ? "positive" : "negative",
    },
  ];

  return (
    <div className="app-page flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-slide-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1
            className="text-2xl sm:text-[28px] font-black"
            style={{ color: "#1d1d1f", letterSpacing: "-0.03em" }}
          >
            Welcome back, {user?.fullName?.split(" ")[0] || "Friend"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6e6e73" }}>
            Live financial balance and AI-driven spending breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            to="/receipt-scanner"
            className="app-action-secondary flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 glass-card hover:shadow-md text-sm font-semibold rounded-xl active-press transition-all"
            style={{ color: "#1d1d1f" }}
          >
            <Scan size={15} style={{ color: "#4f46e5" }} />
            <span>Scan Receipt</span>
          </Link>
          <Link
            to="/expenses"
            className="app-action-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-500/20 active-press transition-all"
            style={{ background: "#4f46e5" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#3730a3")}
            onMouseLeave={e => (e.currentTarget.style.background = "#4f46e5")}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryData.map((item, index) => (
          <SummaryCard key={index} {...item} />
        ))}
      </div>

      {/* AI Advisory Banner */}
      <div
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
        style={{ border: "1px solid rgba(79,70,229,0.12)" }}
      >
        {/* Subtle indigo tint */}
        <div
          className="absolute top-0 right-0 w-64 h-64 pointer-events-none rounded-full opacity-[0.04] blur-3xl"
          style={{ background: "#4f46e5" }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="insight-mark w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#eef2ff", color: "#4f46e5" }}
            >
              <Sparkles size={19} />
            </div>
            <div>
              <h2
                className="text-[15px] font-bold"
                style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
              >
                Gemini Financial Intelligence
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#6e6e73" }}>
                Automated insights based on real spending history
              </p>
            </div>
          </div>

          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-semibold active-press"
            style={{ color: "#4f46e5" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#3730a3")}
            onMouseLeave={e => (e.currentTarget.style.color = "#4f46e5")}
          >
            <span>View Full Analytics</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {loadingInsights ? (
          <div className="py-5 flex items-center gap-2.5 text-sm" style={{ color: "#6e6e73" }}>
            <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Analyzing income and expenditure velocity...
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm py-3" style={{ color: "#aeaeb2" }}>
            Add transactions to unlock personalized Gemini AI spending recommendations.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
            {insights.slice(0, 3).map((insight, idx) => (
              <div
                key={idx}
                className="insight-card p-4 rounded-xl"
                style={{
                  background: "#f5f5f7",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      insight.type === "success"
                        ? "bg-emerald-500"
                        : insight.type === "warning"
                        ? "bg-rose-500"
                        : "bg-indigo-500"
                    }`}
                  />
                  <h3
                    className="text-xs font-bold truncate"
                    style={{ color: "#1d1d1f" }}
                  >
                    {insight.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#6e6e73" }}>
                  {insight.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Transactions + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-[15px] font-bold flex items-center gap-2"
              style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
            >
              <Activity size={17} style={{ color: "#4f46e5" }} />
              Recent Transactions
            </h2>
            <div className="flex gap-4 text-xs font-semibold" style={{ color: "#aeaeb2" }}>
              <Link
                to="/expenses"
                className="transition-colors hover:text-indigo-600"
                style={{ color: "#6e6e73" }}
              >
                All Expenses
              </Link>
              <span style={{ color: "#e5e5ea" }}>·</span>
              <Link
                to="/income"
                className="transition-colors hover:text-indigo-600"
                style={{ color: "#6e6e73" }}
              >
                All Income
              </Link>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl py-12 text-center"
              style={{ border: "1.5px dashed rgba(0,0,0,0.10)" }}
            >
              <p className="text-sm font-semibold mb-1.5" style={{ color: "#1d1d1f" }}>
                No transactions recorded yet
              </p>
              <p className="text-xs mb-5 max-w-xs" style={{ color: "#aeaeb2" }}>
                Start logging your income or expenses to see real-time cashflow activity.
              </p>
              <div className="flex gap-2.5">
                <Link
                  to="/income"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold active-press"
                  style={{ background: "#f0fdf4", color: "#059669", border: "1px solid rgba(5,150,105,0.15)" }}
                >
                  + Add Income
                </Link>
                <Link
                  to="/expenses"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold active-press"
                  style={{ background: "#eef2ff", color: "#4f46e5", border: "1px solid rgba(79,70,229,0.15)" }}
                >
                  + Add Expense
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx._id}
                  className="transaction-row flex items-center justify-between p-3.5 rounded-xl transition-colors"
                  style={{ background: "#f5f5f7", border: "1px solid transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`transaction-icon ${tx.type === "income" ? "is-income" : "is-expense"} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}
                      style={
                        tx.type === "income"
                          ? { background: "#f0fdf4", color: "#059669" }
                          : { background: "#fef2f2", color: "#dc2626" }
                      }
                    >
                      {tx.type === "income" ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                    </div>
                    <div>
                      <p className="transaction-title text-sm font-semibold leading-tight">
                        {tx.title}
                      </p>
                      <p className="transaction-meta text-[11px] mt-0.5">
                        {tx.subtitle} · {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`transaction-amount ${tx.type === "income" ? "is-income" : "is-expense"} text-sm font-bold font-mono`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Chart */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <h2
            className="text-[15px] font-bold mb-4"
            style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
          >
            Monthly Overview
          </h2>

          {loadingAnalytics ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "#aeaeb2" }}>
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading...
            </div>
          ) : !analytics?.monthlyIncomeExpense || analytics.monthlyIncomeExpense.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-xl text-center p-4"
              style={{ border: "1.5px dashed rgba(0,0,0,0.10)" }}
            >
              <p className="text-xs" style={{ color: "#aeaeb2" }}>No monthly data available yet.</p>
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.monthlyIncomeExpense}
                  margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="transparent"
                    tick={{ fill: "#aeaeb2", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fill: "#aeaeb2", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "rgba(0,0,0,0.08)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                      fontSize: "12px",
                      color: "#1d1d1f",
                    }}
                    itemStyle={{ color: "#1d1d1f" }}
                    formatter={(val) => formatCurrency(val)}
                  />
                  <Bar dataKey="income" fill="#4f46e5" radius={[5, 5, 0, 0]} name="Income" opacity={0.85} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[5, 5, 0, 0]} name="Expense" opacity={0.75} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div
            className="pt-4 flex justify-between items-center text-xs mt-auto"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)", color: "#aeaeb2" }}
          >
            <span>Aggregated monthly</span>
            <Link
              to="/analytics"
              className="font-semibold transition-colors"
              style={{ color: "#4f46e5" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#3730a3")}
              onMouseLeave={e => (e.currentTarget.style.color = "#4f46e5")}
            >
              Full report →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
