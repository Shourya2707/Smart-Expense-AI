const { db } = require("../config/db");

// created_at is UTC (SQLite CURRENT_TIMESTAMP); day granularity is fine for usage charts.
module.exports = {
  insert: ({ userId = null, feature, model, toolName = null, promptTokens = null, completionTokens = null, totalTokens = null, latencyMs, success = true, error = null }) =>
    db.prepare(`
      INSERT INTO ai_events (user_id, feature, model, tool_name, prompt_tokens, completion_tokens, total_tokens, latency_ms, success, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, feature, model, toolName, promptTokens, completionTokens, totalTokens, latencyMs, success ? 1 : 0, error),

  dailySeries: (days = 14) =>
    db.prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS runs, SUM(total_tokens) AS tokens, SUM(success) AS okRuns
      FROM ai_events WHERE created_at >= date('now', ?)
      GROUP BY day ORDER BY day
    `).all(`-${days} days`),

  toolBreakdown: () =>
    db.prepare(`
      SELECT tool_name AS tool, COUNT(*) AS calls, SUM(success) AS okCalls, CAST(AVG(latency_ms) AS INTEGER) AS avgLatencyMs
      FROM ai_events WHERE feature = 'tool' AND tool_name IS NOT NULL
      GROUP BY tool_name ORDER BY calls DESC
    `).all(),

  totals: () =>
    db.prepare(`
      SELECT COUNT(*) AS runs, SUM(success) AS okRuns, SUM(total_tokens) AS tokens,
             CAST(AVG(latency_ms) AS INTEGER) AS avgLatencyMs
      FROM ai_events
    `).get(),

  recentErrors: (limit = 10) =>
    db.prepare("SELECT feature, model, tool_name, error, latency_ms, created_at FROM ai_events WHERE success = 0 ORDER BY id DESC LIMIT ?").all(limit),
};
