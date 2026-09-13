const express = require("express");
const {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  startGoogle,
  startGoogleLink,
  googleCallback,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.get("/google", startGoogle);
router.get("/google/link", protect, startGoogleLink);
router.get("/google/callback", googleCallback);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

module.exports = router;
