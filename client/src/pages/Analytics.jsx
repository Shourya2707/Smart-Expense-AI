import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, Activity, Award, PieChart as PieIcon, BarChart3 } from "lucide-react";
import API from "../services/api";
import SummaryCard from "../components/SummaryCard";
import { formatCurrency } from "../utils/formatters";

// Light-friendly chart palette
const CHART_COLORS = [
  "#4f46e5", "#0ea5e9", "#059669", "#d97706",
  "#dc2626", "#9333ea", "#db2777", "#6b7280",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  borderColor: "rgba(0,0,0,0.08)",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  fontSize: "12px",
  color: "#1d1d1f",
};

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await API.get("/api/analytics");
        if (response.data.success) setData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium" style={{ color: "#aeaeb2" }}>
          Generating financial analytics...
        </p>
      </div>
    );
  }

  if (!data || data.totalTransactions === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-sm mx-auto p-6 animate-slide-up">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "#eef2ff", color: "#4f46e5" }}
        >
          <Activity size={28} />
        </div>
        <h2 className="text-xl font-black mb-2" style={{ color: "#1d1d1f", letterSpacing: "-0.025em" }}>
          No financial records yet
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "#6e6e73" }}>
          Add your first income stream or expense to unlock visual breakdowns and monthly trend reports.
        </p>
      </div>
    );
  }

  const {
    totalIncome, totalExpenses, currentBalance, totalTransactions,
    categoryWiseExpense, monthlyIncomeExpense, highestExpenseCategory, highestIncomeSource,
  } = data;

  const numMonths = monthlyIncomeExpense.length || 1;
  const avgMonthlyIncome = totalIncome / numMonths;
  const avgMonthlyExpense = totalExpenses / numMonths;

  const summaryData = [
    {
      title: "Current Balance",
      amount: formatCurrency(currentBalance),
      icon: <Wallet size={18} />,
      colorClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
      trend: "Net Position",
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
      title: "Logged Transactions",
      amount: String(totalTransactions),
      icon: <Activity size={18} />,
      colorClass: "bg-amber-50 text-amber-600 border-amber-100",
      trend: "Total Records",
      trendType: "neutral",
    },
  ];

  const legendStyle = { fontSize: "11px", color: "#6e6e73" };

  return (
    <div className="app-page flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-slide-up">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-[28px] font-black flex items-center gap-2.5"
          style={{ color: "#1d1d1f", letterSpacing: "-0.03em" }}
        >
          <BarChart3 size={24} style={{ color: "#4f46e5" }} />
          Financial Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#6e6e73" }}>
          Visual cashflow reports, budget distributions, and historical trends.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryData.map((item, index) => (
          <SummaryCard key={index} {...item} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart — Income vs Expenses */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="mb-5">
            <h2 className="text-[15px] font-bold" style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}>
              Income vs Expenses
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#6e6e73" }}>Monthly cashflow comparison</p>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyIncomeExpense} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: "#1d1d1f" }}
                  formatter={(val) => formatCurrency(val)}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "16px", ...legendStyle }}
                />
                <Bar dataKey="income" name="Income" fill="#4f46e5" radius={[5, 5, 0, 0]} maxBarSize={40} opacity={0.9} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[5, 5, 0, 0]} maxBarSize={40} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart — Expense Breakdown */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}>
                Expense Breakdown
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#6e6e73" }}>Distribution across categories</p>
            </div>
            <div
              className="analytics-icon w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#eef2ff", color: "#4f46e5" }}
            >
              <PieIcon size={15} />
            </div>
          </div>

          <div className="h-[300px] w-full flex items-center justify-center">
            {categoryWiseExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryWiseExpense}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryWiseExpense.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: "#1d1d1f" }}
                  />
                  <Legend
                    iconType="circle"
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "#6e6e73" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm" style={{ color: "#aeaeb2" }}>No expense category data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Key Highlights */}
      <div className="glass-card rounded-2xl p-6">
        <h2
          className="text-[15px] font-bold mb-5 flex items-center gap-2"
          style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
        >
          <Award size={18} style={{ color: "#d97706" }} />
          Key Financial Highlights
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Top Expense Category", value: highestExpenseCategory, valueColor: "#1d1d1f" },
            { label: "Top Income Source", value: highestIncomeSource, valueColor: "#059669" },
            { label: "Avg Monthly Burn", value: formatCurrency(avgMonthlyExpense), valueColor: "#dc2626" },
            { label: "Avg Monthly Inflow", value: formatCurrency(avgMonthlyIncome), valueColor: "#059669" },
          ].map((item) => (
            <div
              key={item.label}
              className="highlight-card p-4 rounded-xl"
              style={{ background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest block mb-2"
                style={{ color: "#aeaeb2" }}
              >
                {item.label}
              </span>
              <p
                className="text-base font-bold font-mono"
                style={{ color: item.valueColor, letterSpacing: "-0.02em" }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
