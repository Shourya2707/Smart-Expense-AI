const express = require("express");
const { getBudgets, upsertBudget, deleteBudget } = require("../controllers/budgetController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

router.route("/")
  .get(getBudgets)
  .post(upsertBudget);

router.route("/:category")
  .delete(deleteBudget);

module.exports = router;
