const Groq = require("groq-sdk").default || require("groq-sdk");
const { env } = require("../../config/env");
const Expense = require("../../models/Expense");
const Income = require("../../models/Income");
const { monthlySeries, categoryTotals } = require("../analyticsService");
const AiEvent = require("../../models/AiEvent");

const round = (n) => Math.round(n * 100) / 100;
const rupees = (n) => `₹${round(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Deterministic insights computed from real data. Always available, used as the
 * baseline (and as the fallback when Groq is not configured or fails).
 */
async function localInsights(userId) {
  const [expenses, incomes] = await Promise.all([Expense.list(userId), Income.list(userId)]);
  const insights = [];

  if (!expenses.length && !incomes.length) {
    return [{ type: "info", title: "Start with one transaction", message: "Add your first income or expense to see your financial picture here." }];
  }

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : null;

  insights.push({
    type: savings >= 0 ? "success" : "warning",
    title: savings >= 0 ? "You are in the black" : "Spending is ahead of income",
    message: savings >= 0
      ? `${rupees(savings)} left after recorded expenses${savingsRate !== null ? ` — a ${savingsRate}% savings rate` : ""}.`
      : `Expenses are ${rupees(Math.abs(savings))} above recorded income. Review your largest categories below.`,
  });

  const catTotals = categoryTotals(expenses);
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const share = totalExpenses > 0 ? Math.round((topCat[1] / totalExpenses) * 100) : 0;
    const count = expenses.filter((e) => e.category === topCat[0]).length;
    insights.push({
      type: share >= 50 ? "warning" : "info",
      title: `${topCat[0]} leads spending`,
      message: `${rupees(topCat[1])} across ${count} transaction${count === 1 ? "" : "s"} — ${share}% of everything you've spent.`,
    });
  }

  const series = monthlySeries(expenses, incomes);
  if (series.length >= 2) {
    const prev = series[series.length - 2];
    const curr = series[series.length - 1];
    const delta = round(curr.expense - prev.expense);
    if (prev.expense > 0 && Math.abs(delta) > 0) {
      const pct = Math.round((delta / prev.expense) * 100);
      insights.push({
        type: delta > 0 ? "warning" : "success",
        title: `Spending ${delta > 0 ? "up" : "down"} ${Math.abs(pct)}% vs ${prev.month}`,
        message: `${curr.month} outflow is ${rupees(curr.expense)} vs ${rupees(prev.expense)} in ${prev.month}.`,
      });
    }
  }

  const biggest = expenses.reduce((max, e) => (!max || e.amount > max.amount ? e : max), null);
  if (biggest) {
    insights.push({
      type: "info",
      title: "Largest single expense",
      message: `${rupees(biggest.amount)} — ${biggest.description} (${biggest.category}) on ${biggest.date}.`,
    });
  }

  return insights.slice(0, 4);
}

function extractJSON(text) {
  try {
    return JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
  } catch {
    const start = text.search(/[\[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    try {
      return start >= 0 ? JSON.parse(text.slice(start, end + 1)) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Groq-enhanced insights: real numbers computed locally, one small LLM call to
 * phrase an extra forward-looking observation. Falls back to local-only.
 */
async function getInsights(userId) {
  const local = await localInsights(userId);
  if (!env.groqApiKey || local.length < 2) return { insights: local, source: "local" };

  const started = Date.now();
  try {
    const summary = local.map((i) => `${i.title}: ${i.message}`).join(" | ");
    const groq = new Groq({ apiKey: env.groqApiKey });
    const response = await groq.chat.completions.create({
      model: env.groqTextModel,
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `You are a personal finance coach. Based on these verified facts about a user's finances: ${summary}. Return JSON only: {"type":"success|warning|info","title":"max 5 words","message":"one actionable sentence with a concrete suggestion"}. Give ONE forward-looking suggestion that is NOT already stated in the facts.`,
        },
      ],
    });
    const parsed = extractJSON(response.choices[0]?.message?.content || "{}");
    const usage = response.usage || {};
    AiEvent.insert({
      userId,
      feature: "insights",
      model: env.groqTextModel,
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      latencyMs: Date.now() - started,
      success: true,
    });
    if (parsed?.title && parsed?.message && ["success", "warning", "info"].includes(parsed.type)) {
      // Prepend: localInsights caps at 4, so appending would silently drop the LLM suggestion.
      return { insights: [{ type: parsed.type, title: parsed.title, message: parsed.message }, ...local].slice(0, 4), source: "groq" };
    }
  } catch (error) {
    AiEvent.insert({ userId, feature: "insights", model: env.groqTextModel, latencyMs: Date.now() - started, success: false, error: error.message });
    console.warn("Groq insights enhancement failed:", error.message);
  }
  return { insights: local, source: "local" };
}

module.exports = { getInsights, localInsights };
