const RequestLog = require("../models/RequestLog");

// Records every API call (method, path, status, duration, user) for the admin
// observability dashboard. Fire-and-forget: telemetry must never break a request.
const requestTelemetry = (req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    try {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      RequestLog.insert({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
        userId: req.user?._id ?? null,
      });
    } catch (error) {
      console.warn("Telemetry write failed:", error.message);
    }
  });
  next();
};

module.exports = { requestTelemetry };
