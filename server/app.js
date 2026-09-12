const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { env } = require("./config/env"); // loads + validates dotenv on first require
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const { requestTelemetry } = require("./middleware/telemetryMiddleware");

const app = express();

// --------------- Middleware ---------------
// Production: only configured origins may call the API with credentials.
// Development: reflect the requesting origin so Vite HMR works.
app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin || !env.isProd || env.allowedOrigins.includes(requestOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin denied: ${requestOrigin}`));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestTelemetry);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// --------------- Routes ---------------
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "SmartExpense AI Backend Running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/income", require("./routes/incomeRoutes"));
app.use("/api/budgets", require("./routes/budgetRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Railway can serve the built Vite app from the same process.
const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res, next) => (req.path.startsWith("/api/") ? next() : res.sendFile(path.join(clientDist, "index.html"))));
}

// --------------- Error Handling ---------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
