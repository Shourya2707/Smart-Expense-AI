const express = require("express");
const { getAnalytics } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getAnalytics);

module.exports = router;
