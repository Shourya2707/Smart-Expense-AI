const Expense = require("../models/Expense");
const mongoose = require("mongoose");

// @desc    Get all expenses for logged in user
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error("Get Expenses Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    const normalizedDescription = typeof description === "string" ? description.trim() : "";

    if (!amount || !category || !normalizedDescription || !date) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const expense = await Expense.create({
      userId: req.user._id,
      amount: parsedAmount,
      category,
      description: normalizedDescription,
      date,
    });

    res.status(201).json({ success: true, data: expense, message: "Expense created successfully" });
  } catch (error) {
    console.error("Create Expense Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }
    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    // Make sure user owns expense
    if (expense.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized to update this expense" });
    }

    const { amount, category, description, date } = req.body;
    const updateFields = {};
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
      }
      updateFields.amount = parsedAmount;
    }
    if (category !== undefined) updateFields.category = category;
    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ success: false, message: "Description cannot be empty" });
      }
      updateFields.description = description.trim();
    }
    if (date !== undefined) updateFields.date = date;

    expense = await Expense.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: expense, message: "Expense updated successfully" });
  } catch (error) {
    console.error("Update Expense Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    // Make sure user owns expense
    if (expense.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized to delete this expense" });
    }

    await expense.deleteOne();

    res.status(200).json({ success: true, data: {}, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete Expense Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
