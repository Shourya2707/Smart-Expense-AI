const express = require("express");
const multer = require("multer");
const { chat, chatHistory, chatReset, getInsights, scanReceipt } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Conversational assistant
router.post("/chat", chat);
router.get("/chat/history", chatHistory);
router.post("/chat/reset", chatReset);

// Insights
router.get("/insights", getInsights);

// Receipt upload — 5MB max, memory storage. Groq vision accepts jpeg/png/webp only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), false);
  },
});

const handleUpload = (req, res, next) => {
  upload.single("receipt")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum supported image size is 5MB." : err.message;
      return res.status(400).json({ success: false, message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

router.post("/scan-receipt", handleUpload, scanReceipt);

module.exports = router;
