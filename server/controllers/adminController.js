const RequestLog = require("../models/RequestLog");
const AiEvent = require("../models/AiEvent");
const { env } = require("../config/env");

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

/** GET /api/admin/overview — headline numbers for the observability dashboard. */
exports.overview = async (req, res) => {
  try {
    const requests = RequestLog.totals();
    const ai = AiEvent.totals();
    const latencies = RequestLog.latency();

    res.json({
      success: true,
      data: {
        requests: {
          total: requests.requests || 0,
          last24h: requests.requests24h || 0,
          errors: requests.errors || 0,
          errorRate: requests.requests > 0 ? Math.round((requests.errors / requests.requests) * 1000) / 10 : 0,
          avgLatencyMs: requests.avgLatencyMs || 0,
          p95LatencyMs: percentile(latencies, 95),
        },
        ai: {
          runs: ai.runs || 0,
          okRuns: ai.okRuns || 0,
          successRate: ai.runs > 0 ? Math.round((ai.okRuns / ai.runs) * 1000) / 10 : 0,
          tokens: ai.tokens || 0,
          avgLatencyMs: ai.avgLatencyMs || 0,
          llmConfigured: Boolean(env.groqApiKey),
          textModel: env.groqTextModel,
        },
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET /api/admin/series?days=14 — per-day traffic and AI usage for charts. */
exports.series = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 14, 7), 60);
    const requestSeries = RequestLog.dailySeries(days);
    const aiSeries = AiEvent.dailySeries(days);
    const aiByDay = new Map(aiSeries.map((r) => [r.day, r]));

    const data = requestSeries.map((r) => ({
      day: r.day,
      requests: r.requests,
      errors: r.errors,
      aiRuns: aiByDay.get(r.day)?.runs || 0,
      tokens: aiByDay.get(r.day)?.tokens || 0,
    }));
    // Include AI-only days (no HTTP traffic logged is rare, but keep charts honest).
    for (const r of aiSeries) {
      if (!data.some((d) => d.day === r.day)) {
        data.push({ day: r.day, requests: 0, errors: 0, aiRuns: r.runs, tokens: r.tokens });
      }
    }
    data.sort((a, b) => (a.day < b.day ? -1 : 1));
    res.json({ success: true, data });
  } catch (error) {
    console.error("Admin series error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET /api/admin/tools — per-tool call volume and success rate. */
exports.tools = async (req, res) => {
  try {
    res.json({ success: true, data: AiEvent.toolBreakdown() });
  } catch (error) {
    console.error("Admin tools error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET /api/admin/errors — most recent AI failures. */
exports.errors = async (req, res) => {
  try {
    res.json({ success: true, data: AiEvent.recentErrors(10) });
  } catch (error) {
    console.error("Admin errors error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
