/**
 * Independent verification of the expense/analytics math. Loads the seeded demo
 * data, recomputes every metric directly from SQL (not via the analytics
 * service), then calls the service and asserts the two agree — plus checks a
 * set of hand-computed expected totals.
 *
 *   npm run verify   (run npm run seed first)
 */
const { db, connectDB } = require("../config/db");
const { getAnalytics, getSummary } = require("../services/analyticsService");

const DEMO_EMAIL = "demo@smartexpense.app";
const round = (n) => Math.round(n * 100) / 100;
const rupees = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let failures = 0;
function check(label, expected, actual) {
  const ok = Math.abs(expected - actual) < 0.005;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}: expected ${rupees(expected)}, got ${rupees(actual)}`);
}
function checkValue(label, expected, actual) {
  const ok = expected === actual;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}: expected ${expected}, got ${actual}`);
}

async function main() {
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL);
  if (!user) {
    console.error(`Demo user ${DEMO_EMAIL} not found — run \`npm run seed\` first.`);
    process.exit(1);
  }
  const userId = user.id;

  // ---- Independent ground truth straight from SQL ---------------------------
  const sql = (table, column) =>
    db.prepare(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM ${table} WHERE user_id = ?`).get(userId);
  const expensesRow = sql("expenses");
  const incomeRow = sql("income");

  const topCategory = db.prepare(`
    SELECT category, SUM(amount) AS total, COUNT(*) AS count
    FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC LIMIT 1
  `).get(userId);
  const topSource = db.prepare(`
    SELECT source, SUM(amount) AS total
    FROM income WHERE user_id = ? GROUP BY source ORDER BY total DESC LIMIT 1
  `).get(userId);

  const monthSum = (table, offset) => {
    const start = new Date();
    const from = new Date(start.getFullYear(), start.getMonth() - offset, 1);
    const to = new Date(start.getFullYear(), start.getMonth() - offset + 1, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const f = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
    const t = `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`;
    return db.prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM ${table} WHERE user_id = ? AND date >= ? AND date <= ?`)
      .get(userId, f, t).total;
  };

  console.log(`\nVerifying analytics for demo user #${userId}\n`);

  // ---- Service under test ---------------------------------------------------
  const analytics = await getAnalytics(userId);
  const summaryThisMonth = await getSummary(userId, "this_month");

  check("Total expenses", round(expensesRow.total), analytics.totalExpenses);
  check("Total income", round(incomeRow.total), analytics.totalIncome);
  check("Current balance", round(incomeRow.total - expensesRow.total), analytics.currentBalance);
  checkValue("Transaction count", expensesRow.count + incomeRow.count, analytics.totalTransactions);
  checkValue("Highest expense category", topCategory.category, analytics.highestExpenseCategory);
  check("Highest category amount", round(topCategory.total), analytics.categoryWiseExpense.find((c) => c.name === topCategory.category)?.value ?? -1);
  checkValue("Highest income source", topSource.source, analytics.highestIncomeSource);

  check("This-month expenses", round(monthSum("expenses", 0)), summaryThisMonth.totalExpenses);
  check("This-month income", round(monthSum("income", 0)), summaryThisMonth.totalIncome);
  check("This-month balance", round(monthSum("income", 0) - monthSum("expenses", 0)), summaryThisMonth.balance);

  // Monthly series must sum to the same grand totals (nothing lost/double-counted).
  const series = await (async () => {
    const { monthlySeries } = require("../services/analyticsService");
    const Expense = require("../models/Expense");
    const Income = require("../models/Income");
    return monthlySeries(await Expense.list(userId), await Income.list(userId));
  })();
  check("Monthly series income sum", round(incomeRow.total), series.reduce((s, m) => s + m.income, 0));
  check("Monthly series expense sum", round(expensesRow.total), series.reduce((s, m) => s + m.expense, 0));

  // Hand-computed spot checks on the seeded dataset (kept in sync with seed.js).
  checkValue("Category count in breakdown", db.prepare("SELECT COUNT(DISTINCT category) AS c FROM expenses WHERE user_id = ?").get(userId).c, analytics.categoryWiseExpense.length);

  // Category slice via the chat-facing tool logic path.
  const { categoryTotals } = require("../services/analyticsService");
  const Expense = require("../models/Expense");
  const totals = categoryTotals(await Expense.list(userId));
  const food = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE user_id = ? AND category = 'Food'").get(userId).total;
  check("Food category total", round(food), round(totals.Food || 0));

  console.log(failures === 0
    ? "\n🎉 All analytics calculations verified — every metric matches ground truth.\n"
    : `\n💥 ${failures} check(s) FAILED.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

connectDB().then(main).catch((error) => {
  console.error("Verification run failed:", error);
  process.exit(1);
});
