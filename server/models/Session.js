const crypto = require("crypto");
const { db } = require("../config/db");
const { env } = require("../config/env");

const COOKIE_NAME = "se_session";
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const now = () => new Date();

const create = async (userId, metadata = {}) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + env.sessionTtlSeconds * 1000);
  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(hashToken(token), userId, expiresAt.toISOString(), createdAt.toISOString(), createdAt.toISOString());
  return { token, expiresAt, userAgent: metadata.userAgent || null, ip: metadata.ip || null };
};

const findByToken = async (token) => {
  if (!token || typeof token !== "string") return null;
  const row = db.prepare(`
    SELECT s.*, u.id AS user_id, u.full_name, u.email, u.auth_provider, u.avatar_url, u.created_at AS user_created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).get(hashToken(token), now().toISOString());
  if (!row) return null;
  db.prepare("UPDATE sessions SET last_used_at = ? WHERE id = ?").run(now().toISOString(), row.id);
  return {
    id: row.id,
    user: {
      _id: row.user_id,
      id: row.user_id,
      fullName: row.full_name,
      email: row.email,
      authProvider: row.auth_provider,
      avatarUrl: row.avatar_url,
      createdAt: row.user_created_at,
    },
    expiresAt: row.expires_at,
  };
};

const revoke = async (token) => {
  if (!token) return false;
  const result = db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(now().toISOString(), hashToken(token));
  return result.changes > 0;
};

const revokeAllForUser = async (userId) => {
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(now().toISOString(), userId);
};

const revokeExpired = async () => {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL").run(now().toISOString());
};

module.exports = { COOKIE_NAME, create, findByToken, revoke, revokeAllForUser, revokeExpired, hashToken };
