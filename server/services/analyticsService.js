const Expense = require("../models/Expense");
const Income = require("../models/Income");

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Others"];
const SOURCES = ["Salary", "Freelancing", "Business", "Investments", "Gift", "Other"];

// Dates are stored as plain "YYYY-MM-DD" strings. Bucket by slicing the string —
// new Date("YYYY-MM-DD") parses as UTC and shifts the month for non-UTC timezones.
const monthKey = (dateStr) => String(dateStr).slice(0, 7); // "YYYY-MM"
const monthLabel = (key) => {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
};

const todayISO = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const isValidDate = (d) => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  // V8's Date.parse rolls "2026-02-30" over to March — round-trip the components instead.
  const [year, month, day] = d.split("-").map(Number);
  const asDate = new Date(year, month - 1, day);
  return asDate.getFullYear() === year && asDate.getMonth() === month - 1 && asDate.getDate() === day;
};

/** Resolve a named period to an inclusive [from, to] date-string range. */
function periodRange(period) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

  switch (period) {
    case "this_month": {
      const s = startOfMonth(now);
      return [iso(s), iso(now)];
    }
    case "last_month": {
      const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return [iso(s), iso(e)];
    }
    case "this_year": {
      const s = new Date(now.getFullYear(), 0, 1);
      return [iso(s), iso(now)];
    }
    default:
      return [null, null]; // all time
  }
}

const inRange = (date, [from, to]) => (!from || date >= from) && (!to || date <= to);

function monthlySeries(expenses, incomes, { fillMonths = true } = {}) {
  const map = {};
  const process = (records, type) => {
    records.forEach((record) => {
      const key = monthKey(record.date);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      map[key][type] += record.amount;
    });
  };
  process(incomes, "income");
  process(expenses, "expense");

  let keys = Object.keys(map).sort();
  // Fill calendar gaps (and empty months after the last transaction) so trends
  // and comparisons are always contiguous — "prev month" must mean prev month.
  if (fillMonths && keys.length) {
    const [fromYear, fromMonth] = keys[0].split("-").map(Number);
    const now = new Date();
    const start = new Date(fromYear, fromMonth - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const pad = (n) => String(n).padStart(2, "0");
    for (const d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      if (!map[key]) map[key] = { income: 0, expense: 0 };
    }
    keys = Object.keys(map).sort();
  }

  return keys.map((key) => ({
    month: monthLabel(key),
    sortKey: key,
    income: Math.round(map[key].income * 100) / 100,
    expense: Math.round(map[key].expense * 100) / 100,
  }));
}

function categoryTotals(expenses) {
  const map = {};
  expenses.forEach((e) => {
    map[e.category] = Math.round(((map[e.category] || 0) + e.amount) * 100) / 100;
  });
  return map;
}

/** Full analytics payload for the /api/analytics endpoint. */
async function getAnalytics(userId) {
  const [expenses, incomes] = await Promise.all([Expense.list(userId), Income.list(userId)]);

  const totalExpenses = Math.round(expenses.reduce((acc, e) => acc + e.amount, 0) * 100) / 100;
  const totalIncome = Math.round(incomes.reduce((acc, i) => acc + i.amount, 0) * 100) / 100;

  const catMap = categoryTotals(expenses);
  const categoryWiseExpense = Object.keys(catMap).map((name) => ({ name, value: catMap[name] }));
  const highestExpenseCategory = Object.keys(catMap).reduce((best, name) => (!best || catMap[name] > catMap[best] ? name : best), null) || "None";

  const srcMap = {};
  incomes.forEach((i) => {
    srcMap[i.source] = (srcMap[i.source] || 0) + i.amount;
  });
  const highestIncomeSource = Object.keys(srcMap).reduce((best, name) => (!best || srcMap[name] > srcMap[best] ? name : best), null) || "None";

  return {
    totalIncome,
    totalExpenses,
    currentBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    totalTransactions: expenses.length + incomes.length,
    categoryWiseExpense,
    monthlyIncomeExpense: monthlySeries(expenses, incomes).map(({ sortKey, ...rest }) => rest),
    highestExpenseCategory,
    highestIncomeSource,
  };
}

/** Compact summary for chat tools, optionally scoped to a period. */
async function getSummary(userId, period = "all") {
  const [expenses, incomes] = await Promise.all([Expense.list(userId), Income.list(userId)]);
  const range = periodRange(period);
  const fExpenses = expenses.filter((e) => inRange(e.date, range));
  const fIncomes = incomes.filter((i) => inRange(i.date, range));

  const totalIncome = Math.round(fIncomes.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const totalExpenses = Math.round(fExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : null;

  return {
    period,
    totalIncome,
    totalExpenses,
    balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    savingsRate,
    transactions: fExpenses.length + fIncomes.length,
  };
}

module.exports = { getAnalytics, getSummary, monthlySeries, categoryTotals, periodRange, inRange, todayISO, isValidDate, CATEGORIES, SOURCES, monthKey, monthLabel };
