const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const Expense = require("../../models/Expense");
const Income = require("../../models/Income");
const { getSummary, categoryTotals, monthlySeries, periodRange, inRange, todayISO, isValidDate, CATEGORIES, SOURCES } = require("../analyticsService");

/**
 * All tools close over the authenticated userId — the model can never read or
 * write another user's data. Every tool returns a plain object (never throws)
 * so the agent can recover from bad arguments instead of crashing the turn.
 */
function buildTools(userId) {
  const round = (n) => Math.round(n * 100) / 100;

  const addExpense = tool(
    async ({ amount, category, description, date }) => {
      const cleanCategory = CATEGORIES.find((c) => c.toLowerCase() === String(category).toLowerCase());
      if (!cleanCategory) return { ok: false, error: `Category must be one of: ${CATEGORIES.join(", ")}` };
      const day = date && isValidDate(date) ? date : todayISO();
      if (date && !isValidDate(date)) return { ok: false, error: "Invalid date. Use YYYY-MM-DD." };
      const created = await Expense.create({ userId, amount: round(amount), category: cleanCategory, description: description.trim(), date: day });
      return { ok: true, expense: created, message: `Expense of ₹${created.amount} (${cleanCategory}) recorded for ${day}.` };
    },
    {
      name: "add_expense",
      description: `Record a new expense for the user. Use when the user says they spent/paid/bought something. Categories: ${CATEGORIES.join(", ")}.`,
      schema: z.object({
        amount: z.coerce.number().positive().describe("Amount spent in INR"),
        category: z.enum(CATEGORIES).describe("Expense category"),
        description: z.string().min(2).max(120).describe("Short description or merchant name"),
        date: z.string().optional().describe("Expense date as YYYY-MM-DD; omit to use today"),
      }),
    }
  );

  const addIncome = tool(
    async ({ amount, source, date }) => {
      const cleanSource = SOURCES.find((s) => s.toLowerCase() === String(source).toLowerCase());
      if (!cleanSource) return { ok: false, error: `Source must be one of: ${SOURCES.join(", ")}` };
      const day = date && isValidDate(date) ? date : todayISO();
      if (date && !isValidDate(date)) return { ok: false, error: "Invalid date. Use YYYY-MM-DD." };
      const created = await Income.create({ userId, amount: round(amount), source: cleanSource, date: day });
      return { ok: true, income: created, message: `Income of ₹${created.amount} (${cleanSource}) recorded for ${day}.` };
    },
    {
      name: "add_income",
      description: `Record new income for the user. Sources: ${SOURCES.join(", ")}.`,
      schema: z.object({
        amount: z.coerce.number().positive().describe("Amount received in INR"),
        source: z.enum(SOURCES).describe("Income source"),
        date: z.string().optional().describe("Income date as YYYY-MM-DD; omit to use today"),
      }),
    }
  );

  const getSummaryTool = tool(
    async ({ period }) => {
      const summary = await getSummary(userId, period);
      return { ok: true, summary };
    },
    {
      name: "get_summary",
      description: "Get income, expense, balance and savings-rate totals. Use for questions like 'how am I doing this month?'",
      schema: z.object({
        period: z.enum(["this_month", "last_month", "this_year", "all"]).describe("Time window for the totals"),
      }),
    }
  );

  const categoryBreakdown = tool(
    async ({ period }) => {
      const expenses = await Expense.list(userId);
      const filtered = expenses.filter((e) => inRange(e.date, periodRange(period)));
      const totals = categoryTotals(filtered);
      const grand = Object.values(totals).reduce((s, v) => s + v, 0);
      const breakdown = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, amount: value, share: grand > 0 ? `${Math.round((value / grand) * 100)}%` : "0%" }));
      return { ok: true, period, totalSpent: round(grand), count: filtered.length, breakdown };
    },
    {
      name: "category_breakdown",
      description: "Spending grouped by category, with amounts and share of total. Use for 'where is my money going?' or 'how much did I spend on Food?'",
      schema: z.object({
        period: z.enum(["this_month", "last_month", "this_year", "all"]).describe("Time window"),
      }),
    }
  );

  const monthlyTrend = tool(
    async ({ months }) => {
      const [expenses, incomes] = await Promise.all([Expense.list(userId), Income.list(userId)]);
      const series = monthlySeries(expenses, incomes).slice(-months);
      return { ok: true, months: series.map(({ sortKey, ...rest }) => ({ ...rest, net: round(rest.income - rest.expense) })) };
    },
    {
      name: "monthly_trend",
      description: "Month-by-month income vs expense for recent months. Use for trends and comparisons.",
      schema: z.object({
        months: z.number().int().min(1).max(12).default(4).describe("How many recent months to return"),
      }),
    }
  );

  const searchTransactions = tool(
    async ({ query, type, limit }) => {
      const expenses = (await Expense.list(userId)).filter((e) => e.description.toLowerCase().includes(query.toLowerCase()));
      const incomes = (await Income.list(userId)).filter((i) => i.source.toLowerCase().includes(query.toLowerCase()));
      let results;
      if (type === "expense") results = expenses.map((e) => ({ type: "expense", ...e }));
      else if (type === "income") results = incomes.map((i) => ({ type: "income", ...i }));
      else results = [...expenses.map((e) => ({ type: "expense", ...e })), ...incomes.map((i) => ({ type: "income", ...i }))];
      results.sort((a, b) => (a.date < b.date ? 1 : -1));
      return { ok: true, count: results.length, results: results.slice(0, limit) };
    },
    {
      name: "search_transactions",
      description: "Search expenses by description/merchant and income by source. Use for 'find my coffee purchases' or 'show salary entries'.",
      schema: z.object({
        query: z.string().min(1).describe("Text to search for"),
        type: z.enum(["expense", "income", "any"]).default("any").describe("Which transaction type to search"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results"),
      }),
    }
  );

  const recentTransactions = tool(
    async ({ limit }) => {
      const [expenses, incomes] = await Promise.all([Expense.list(userId), Income.list(userId)]);
      const combined = [
        ...expenses.map((e) => ({ type: "expense", description: e.description, category: e.category, amount: e.amount, date: e.date })),
        ...incomes.map((i) => ({ type: "income", description: i.source, amount: i.amount, date: i.date })),
      ]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit);
      return { ok: true, count: combined.length, results: combined };
    },
    {
      name: "list_recent_transactions",
      description: "The user's most recent transactions (expenses and income), newest first.",
      schema: z.object({
        limit: z.number().int().min(1).max(20).default(8).describe("How many to return"),
      }),
    }
  );

  return [addExpense, addIncome, getSummaryTool, categoryBreakdown, monthlyTrend, searchTransactions, recentTransactions];
}

module.exports = { buildTools };
