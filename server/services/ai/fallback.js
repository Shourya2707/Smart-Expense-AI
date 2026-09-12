const Expense = require("../../models/Expense");
const Income = require("../../models/Income");
const { getSummary, todayISO, isValidDate, CATEGORIES, SOURCES, periodRange, inRange } = require("../analyticsService");
const AiEvent = require("../../models/AiEvent");

// Deterministic responder used when GROQ_API_KEY is missing or the LLM call fails.
// Understands the most common commands so the assistant never feels dead.

const KEYWORD_CATEGORY = [
  [/grocer|supermarket|vegetable|restaurant|cafe|coffee|food|lunch|dinner|breakfast|zomato|swiggy|eat/i, "Food"],
  [/uber|ola|petrol|fuel|metro|train|bus|flight|cab|travel|irctc/i, "Travel"],
  [/amazon|flipkart|myntra|cloth|shop|mall|purchase|electronics/i, "Shopping"],
  [/rent|electricity|water|internet|broadband|mobile|bill|recharge|wifi|gas/i, "Bills"],
  [/movie|cinema|game|netflix|concert|entertainment|party|spotify/i, "Entertainment"],
  [/doctor|medic|pharmacy|hospital|health|gym|clinic/i, "Health"],
  [/course|tuition|book|college|school|fees|udemy|education/i, "Education"],
];

const guessCategory = (text) => KEYWORD_CATEGORY.find(([re]) => re.test(text))?.[1] || "Others";
const guessSource = (text) => {
  const hit = SOURCES.find((s) => new RegExp(s.slice(0, 6), "i").test(text));
  return hit || (/\bfreelance\b/i.test(text) ? "Freelancing" : "Other");
};

function resolveDate(text) {
  if (/\byesterday\b/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const match = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  return match && isValidDate(match[0]) ? match[0] : todayISO();
}

const PERIODS = [
  [/\blast month\b/i, "last_month"],
  [/\bthis month\b|\bcurrent month\b|\bthis mth\b/i, "this_month"],
  [/\bthis year\b|\byearly\b|\bannual\b/i, "this_year"],
  [/./, "all"],
];

const round = (n) => Math.round(n * 100) / 100;

function addEvent(userId, onEvent, event) {
  onEvent?.(event);
  // Fallback tools are logged too, so tool health charts stay honest in offline mode.
  if (event.type === "tool") {
    try {
      AiEvent.insert({ userId, feature: "tool", model: "fallback", toolName: event.name, latencyMs: 0, success: Boolean(event.result?.ok ?? true) });
    } catch { /* telemetry must never break the request */ }
  }
}

async function tryAddExpense(userId, text, onEvent, { skip = false } = {}) {
  if (skip) return null;
  // "add income 5000" / "got paid 5000" must never land here as an expense.
  if (/\bincome\b|\bsalary\b|\bfreelanc|\breceived\b|\bearned\b|\bgot paid\b/i.test(text)) return null;
  const normalized = text.replace(/(\d),(\d)/g, "$1$2"); // "1,500" → "1500"
  const match = normalized.match(/(?:spent|paid|bought|add(?:ed)?)\s*(?:an?\s*)?(?:expense\s*(?:of|for)?\s*)?(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:on|for|at|towards|in)?\s*(.+)/i);
  if (!match) return null;

  const amount = round(Number(match[1]));
  const rest = match[2].replace(/\b(yesterday|today|on \d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2})\b/gi, "").trim() || "Expense";
  const category = guessCategory(text);
  const date = resolveDate(text);
  const description = rest.replace(/[.?!]+$/, "").slice(0, 80);

  const created = await Expense.create({ userId, amount, category, description, date });
  addEvent(userId, onEvent, { type: "tool", name: "add_expense", args: { amount, category, description, date }, result: { ok: true } });
  return `Logged ₹${amount} for ${description} under ${category} (${date}). I'm running without a Groq API key right now, so I used offline mode — add one in server/.env for the full AI experience.`;
}

async function tryAddIncome(userId, text, onEvent) {
  const normalized = text.replace(/(\d),(\d)/g, "$1$2");
  const match = normalized.match(/(?:received|got\s+paid|got|earned|add(?:ed)?)\s*(?:income\s*(?:of|from)?\s*|salary\s*)?(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:as|from|via)?\s*(.+)/i);
  if (!match || !/incom|salar|freelanc|earned|received|got paid/i.test(text)) return null;

  const amount = round(Number(match[1]));
  const source = guessSource(text);
  const date = resolveDate(text);
  const created = await Income.create({ userId, amount, source, date });
  addEvent(userId, onEvent, { type: "tool", name: "add_income", args: { amount, source, date }, result: { ok: true } });
  return `Recorded ₹${amount} income from ${source} (${date}).`;
}

async function tryAnswerQuestion(userId, text) {
  if (!/how much|total|spend|spent|balance|saving|summary|trend|month|left|status/i.test(text)) return null;

  const period = PERIODS.find(([re]) => re.test(text))[1];
  const summary = await getSummary(userId, period);

  let categoryLine = "";
  if (/food|travel|shopping|bills|entertainment|health|education/i.test(text)) {
    const category = CATEGORIES.find((c) => new RegExp(c, "i").test(text));
    if (category) {
      const [from, to] = periodRange(period);
      const expenses = await Expense.list(userId);
      const spent = round(expenses.filter((e) => e.category === category && inRange(e.date, [from, to])).reduce((s, e) => s + e.amount, 0));
      categoryLine = ` ${category}: ₹${spent} in that window.`;
    }
  }

  return [
    `${period.replace("_", " ")} — income ₹${summary.totalIncome}, expenses ₹${summary.totalExpenses}, balance ₹${summary.balance}.`,
    summary.savingsRate !== null ? `Savings rate: ${summary.savingsRate}%.` : "",
    categoryLine,
  ].filter(Boolean).join(" ");
}

async function runFallback({ userId, userMessage, onEvent, skipAdds = false }) {
  const started = Date.now();
  let text = null;

  const addResult = await tryAddIncome(userId, userMessage, onEvent)
    || await tryAddExpense(userId, userMessage, onEvent, { skip: skipAdds })
    || await tryAnswerQuestion(userId, userMessage);

  if (addResult) {
    text = addResult;
  } else {
    text = "I'm in offline mode (no GROQ_API_KEY), but I can still: log expenses ('spent 250 on groceries yesterday'), record income ('received 50000 salary'), or summarise your spending ('how much did I spend this month?'). Add a Groq API key in server/.env to unlock the full conversational AI.";
  }

  AiEvent.insert({ userId, feature: "chat", model: "fallback", latencyMs: Date.now() - started, success: true });
  return text;
}

module.exports = { runFallback };
