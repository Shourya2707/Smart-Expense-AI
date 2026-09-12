const path = require("path");
require("dotenv").config();

const normalizeOrigin = (value) => value.trim().replace(/\/$/, "");
const configuredOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGINS || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5001,
  clientUrl: configuredOrigins.join(","),
  allowedOrigins: configuredOrigins,
  jwtSecret: process.env.JWT_SECRET || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  // NOTE: Groq retires model IDs periodically. If the agent errors with
  // model_not_found, list available models with:
  //   curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
  groqTextModel: process.env.GROQ_TEXT_MODEL || "qwen/qwen3-32b",
  groqVisionModel: process.env.GROQ_VISION_MODEL || "",
  // NVIDIA NIM — receipt vision (Groq's catalog has no vision models).
  nvidiaApiKey: process.env.NVIDIA_API_KEY || "",
  nvidiaVisionModel: process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct",
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
  if (env.isProd && !env.allowedOrigins.length) {
    console.warn("[env] CLIENT_URL is not set in production — CORS will reject cross-origin browser requests.");
  }
  if (!env.groqApiKey) {
    console.warn("[env] GROQ_API_KEY is not set — AI features run in deterministic fallback mode (no LLM calls).");
  }
}

module.exports = { env, validate };
