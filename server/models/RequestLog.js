const { db } = require("../config/db");

module.exports = {
  insert: ({ method, path, status, durationMs, userId = null }) =>
    db.prepare("INSERT INTO request_log (method, path, status, duration_ms, user_id) VALUES (?, ?, ?, ?, ?)")
      .run(method, path, status, durationMs, userId),

  dailySeries: (days = 14) =>
    db.prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS requests,
             SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
      FROM request_log WHERE created_at >= date('now', ?)
      GROUP BY day ORDER BY day
    `).all(`-${days} days`),

  latency: () =>
    db.prepare("SELECT duration_ms FROM request_log ORDER BY id DESC LIMIT 2000").all().map((r) => r.duration_ms),

  totals: () =>
    db.prepare(`
      SELECT COUNT(*) AS requests,
             SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors,
             SUM(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS requests24h,
             CAST(AVG(duration_ms) AS INTEGER) AS avgLatencyMs
      FROM request_log
    `).get(),
};
