const express = require("express");
const { overview, series, tools, errors } = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/overview", overview);
router.get("/series", series);
router.get("/tools", tools);
router.get("/errors", errors);

module.exports = router;
