const express = require("express");
const { getIncome, createIncome, updateIncome, deleteIncome } = require("../controllers/incomeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

router.route("/")
  .get(getIncome)
  .post(createIncome);

router.route("/:id")
  .put(updateIncome)
  .delete(deleteIncome);

module.exports = router;
