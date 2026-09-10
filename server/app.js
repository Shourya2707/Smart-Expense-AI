const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

// Load environment variables
dotenv.config();

const app = express();

// --------------- Middleware ---------------
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SmartExpense AI Backend Running",
  });
});

// API Routes
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);

// --------------- Error Handling ---------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
