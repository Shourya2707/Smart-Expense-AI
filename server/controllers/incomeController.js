const Income = require("../models/Income");
const { SOURCES, isValidDate } = require("../services/analyticsService");

const validId = (id) => /^\d+$/.test(String(id));
const round = (n) => Math.round(n * 100) / 100;

exports.getIncome = async (req, res) => res.json({ success: true, data: await Income.list(req.user._id) });

exports.createIncome = async (req, res) => {
  const { amount, source, date } = req.body;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0 || !SOURCES.includes(source) || !isValidDate(date)) {
    return res.status(400).json({ success: false, message: "Enter a valid amount, source, and date (YYYY-MM-DD)." });
  }
  const data = await Income.create({ userId: req.user._id, amount: round(parsed), source, date });
  res.status(201).json({ success: true, data, message: "Income saved." });
};

exports.updateIncome = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid income id." });
  const existing = await Income.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Income not found." });
  if (existing.userId !== req.user._id) return res.status(403).json({ success: false, message: "You cannot edit this income." });

  const fields = {};
  if (req.body.amount !== undefined) {
    const n = Number(req.body.amount);
    if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ success: false, message: "Amount must be greater than 0." });
    fields.amount = round(n);
  }
  if (req.body.source !== undefined) {
    if (!SOURCES.includes(req.body.source)) return res.status(400).json({ success: false, message: `Source must be one of: ${SOURCES.join(", ")}` });
    fields.source = req.body.source;
  }
  if (req.body.date !== undefined) {
    if (!isValidDate(req.body.date)) return res.status(400).json({ success: false, message: "Date must be YYYY-MM-DD." });
    fields.date = req.body.date;
  }
  if (!Object.keys(fields).length) return res.status(400).json({ success: false, message: "Nothing to update." });

  res.json({ success: true, data: await Income.update(req.params.id, fields), message: "Income updated." });
};

exports.deleteIncome = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid income id." });
  const existing = await Income.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Income not found." });
  if (existing.userId !== req.user._id) return res.status(403).json({ success: false, message: "You cannot delete this income." });
  Income.remove(req.params.id);
  res.json({ success: true, data: {}, message: "Income deleted." });
};
