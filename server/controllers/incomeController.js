const Income = require("../models/Income");
const mongoose = require("mongoose");

// @desc    Get all income for logged in user
// @route   GET /api/income
// @access  Private
exports.getIncome = async (req, res) => {
  try {
    const income = await Income.find({ userId: req.user._id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: income });
  } catch (error) {
    console.error("Get Income Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Create new income
// @route   POST /api/income
// @access  Private
exports.createIncome = async (req, res) => {
  try {
    const { amount, source, date } = req.body;

    if (!amount || !source || !date) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const income = await Income.create({
      userId: req.user._id,
      amount: parsedAmount,
      source,
      date,
    });

    res.status(201).json({ success: true, data: income, message: "Income created successfully" });
  } catch (error) {
    console.error("Create Income Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update an income
// @route   PUT /api/income/:id
// @access  Private
exports.updateIncome = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid income id" });
    }
    let income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({ success: false, message: "Income not found" });
    }

    // Make sure user owns income
    if (income.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized to update this income" });
    }

    const { amount, source, date } = req.body;
    const updateFields = {};
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
      }
      updateFields.amount = parsedAmount;
    }
    if (source !== undefined) updateFields.source = source;
    if (date !== undefined) updateFields.date = date;

    income = await Income.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: income, message: "Income updated successfully" });
  } catch (error) {
    console.error("Update Income Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete an income
// @route   DELETE /api/income/:id
// @access  Private
exports.deleteIncome = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid income id" });
    }
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({ success: false, message: "Income not found" });
    }

    // Make sure user owns income
    if (income.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized to delete this income" });
    }

    await income.deleteOne();

    res.status(200).json({ success: true, data: {}, message: "Income deleted successfully" });
  } catch (error) {
    console.error("Delete Income Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
