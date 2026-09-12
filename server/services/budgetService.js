const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const { periodRange, inRange } = require("./analyticsService");

const round = (n) => Math.round(n * 100) / 100;

/** Per-budget month-to-date progress for the authenticated user. */
async function getBudgetProgress(userId) {
  const [budgets, expenses] = await Promise.all([Budget.list(userId), Expense.list(userId)]);

  const [from, to] = periodRange("this_month");
  const spentByCategory = {};
  expenses.forEach((e) => {
    if (inRange(e.date, [from, to])) spentByCategory[e.category] = (spentByCategory[e.category] || 0) + e.amount;
  });

  return budgets
    .map((b) => {
      const spent = round(spentByCategory[b.category] || 0);
      const remaining = round(b.monthlyLimit - spent);
      const pct = b.monthlyLimit > 0 ? round((spent / b.monthlyLimit) * 100) : 0;
      const status = spent > b.monthlyLimit ? "over" : (pct >= 80 ? "warning" : "ok");
      return { category: b.category, monthlyLimit: b.monthlyLimit, spent, remaining, pct, status };
    })
    .sort((a, b) => b.pct - a.pct);
}

module.exports = { getBudgetProgress };
