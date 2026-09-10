const express = require("express");
const { getExpenses, createExpense, updateExpense, deleteExpense } = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

router.route("/")
  .get(getExpenses)
  .post(createExpense);

router.route("/:id")
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
