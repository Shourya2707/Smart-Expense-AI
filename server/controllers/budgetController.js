const Budget = require("../models/Budget");
const budgetService = require("../services/budgetService");
const { CATEGORIES } = require("../services/analyticsService");

const round = (n) => Math.round(n * 100) / 100;

exports.getBudgets = async (req, res) => res.json({ success: true, data: await budgetService.getBudgetProgress(req.user._id) });

exports.upsertBudget = async (req, res) => {
  const { category, monthlyLimit } = req.body;
  const limit = Number(monthlyLimit);
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: `Category must be one of: ${CATEGORIES.join(", ")}` });
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    return res.status(400).json({ success: false, message: "Monthly limit must be a number greater than 0." });
  }
  const data = await Budget.upsert(req.user._id, category, round(limit));
  res.status(201).json({ success: true, data, message: "Budget saved." });
};

exports.deleteBudget = async (req, res) => {
  const { category } = req.params;
  if (!category) return res.status(400).json({ success: false, message: "Category is required." });
  // Idempotent: deleting a non-existent budget still succeeds.
  Budget.remove(req.user._id, category);
  res.json({ success: true, message: "Budget removed." });
};
