const crypto = require("crypto");
const { db } = require("../config/db");
const { env } = require("../config/env");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const create = async (userId, ttlSeconds = 60 * 60) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= ?").run(userId, new Date().toISOString());
  db.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
};

const findValid = async (token) => {
  if (!token || typeof token !== "string") return null;
  return db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
  `).get(hashToken(token), new Date().toISOString()) || null;
};

const consume = async (tokenId) => {
  const result = db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL")
    .run(new Date().toISOString(), tokenId);
  return result.changes > 0;
};

const isDeliveryConfigured = () => Boolean(env.passwordResetWebhookUrl);

module.exports = { create, findValid, consume, hashToken, isDeliveryConfigured };
