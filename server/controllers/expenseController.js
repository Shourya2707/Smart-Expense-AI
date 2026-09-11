const Expense = require("../models/Expense");
const { CATEGORIES, isValidDate } = require("../services/analyticsService");

const validId = (id) => /^\d+$/.test(String(id));
const round = (n) => Math.round(n * 100) / 100;

exports.getExpenses = async (req, res) => res.json({ success: true, data: await Expense.list(req.user._id) });

exports.createExpense = async (req, res) => {
  const { amount, category, description, date } = req.body;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0 || !CATEGORIES.includes(category) || !description?.trim() || !isValidDate(date)) {
    return res.status(400).json({ success: false, message: "Enter a valid amount, category, description, and date (YYYY-MM-DD)." });
  }
  const data = await Expense.create({ userId: req.user._id, amount: round(parsed), category, description: description.trim(), date });
  res.status(201).json({ success: true, data, message: "Expense saved." });
};

exports.updateExpense = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid expense id." });
  const existing = await Expense.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Expense not found." });
  if (existing.userId !== req.user._id) return res.status(403).json({ success: false, message: "You cannot edit this expense." });

  const fields = {};
  if (req.body.amount !== undefined) {
    const n = Number(req.body.amount);
    if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ success: false, message: "Amount must be greater than 0." });
    fields.amount = round(n);
  }
  if (req.body.category !== undefined) {
    if (!CATEGORIES.includes(req.body.category)) return res.status(400).json({ success: false, message: `Category must be one of: ${CATEGORIES.join(", ")}` });
    fields.category = req.body.category;
  }
  if (req.body.description !== undefined) {
    if (!String(req.body.description).trim()) return res.status(400).json({ success: false, message: "Description cannot be empty." });
    fields.description = String(req.body.description).trim();
  }
  if (req.body.date !== undefined) {
    if (!isValidDate(req.body.date)) return res.status(400).json({ success: false, message: "Date must be YYYY-MM-DD." });
    fields.date = req.body.date;
  }
  if (!Object.keys(fields).length) return res.status(400).json({ success: false, message: "Nothing to update." });

  res.json({ success: true, data: await Expense.update(req.params.id, fields), message: "Expense updated." });
};

exports.deleteExpense = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid expense id." });
  const existing = await Expense.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Expense not found." });
  if (existing.userId !== req.user._id) return res.status(403).json({ success: false, message: "You cannot delete this expense." });
  Expense.remove(req.params.id);
  res.json({ success: true, data: {}, message: "Expense deleted." });
};
