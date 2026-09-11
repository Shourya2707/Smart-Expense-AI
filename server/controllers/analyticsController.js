const { getAnalytics } = require("../services/analyticsService");

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private
exports.getAnalytics = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: await getAnalytics(req.user._id) });
  } catch (error) {
    console.error("Get Analytics Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
