const express = require("express");
const multer = require("multer");
const { getInsights, getGeminiInsights, scanReceipt } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Multer config for receipt uploads — 5MB max, memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed."), false);
    }
  },
});

// Middleware to handle multer file upload errors cleanly
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single("receipt");
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File is too large. Maximum supported image size is 5MB.",
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.get("/insights", protect, getInsights);
router.get("/gemini-insights", protect, getGeminiInsights);
router.post("/scan-receipt", protect, handleUpload, scanReceipt);

module.exports = router;
