const path = require("path");
require("dotenv").config();

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/$/, "");
const configuredOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGINS || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const isProd = process.env.NODE_ENV === "production";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: Number(process.env.PORT) || 5001,
  clientUrl: configuredOrigins.join(","),
  allowedOrigins: configuredOrigins,
  // Development gets a local-only default so a fresh clone can run. Production
  // must provide a real secret through the deployment environment.
  sessionSecret: process.env.SESSION_SECRET || (!isProd ? "local-development-session-secret-change-me" : ""),
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS) || 60 * 60 * 24 * 7,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "",
  passwordResetWebhookUrl: process.env.PASSWORD_RESET_WEBHOOK_URL || "",
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
  if (env.isProd && !env.sessionSecret) {
    throw new Error("SESSION_SECRET is required in production. Set it in Render.");
  }
  if (env.isProd && !env.allowedOrigins.length) {
    console.warn("[env] CLIENT_URL is not set in production — CORS will reject cross-origin browser requests.");
  }
  if (!env.groqApiKey) {
    console.warn("[env] GROQ_API_KEY is not set — AI features run in deterministic fallback mode (no LLM calls).");
  }
  if (env.isProd && (!env.googleClientId || !env.googleClientSecret || !env.googleCallbackUrl)) {
    console.warn("[env] Google OAuth is disabled until GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL are configured.");
  }
}

module.exports = { env, validate };
