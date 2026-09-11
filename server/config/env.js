const path = require("path");
require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5001,
  clientUrl: process.env.CLIENT_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqTextModel: process.env.GROQ_TEXT_MODEL || "llama-3.1-8b-instant",
  groqVisionModel: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
  dataDir: process.env.DATA_DIR || path.join(__dirname, "..", "data"),
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

function validate() {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required. Set it in server/.env (see .env.example).");
  }
  if (env.isProd && !env.clientUrl) {
    console.warn("[env] CLIENT_URL is not set in production — CORS will reject cross-origin browser requests.");
  }
  if (!env.groqApiKey) {
    console.warn("[env] GROQ_API_KEY is not set — AI features run in deterministic fallback mode (no LLM calls).");
  }
}

module.exports = { env, validate };
