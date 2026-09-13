const Session = require("../models/Session");
const { env } = require("../config/env");

const isAdminEmail = (email) => env.adminEmails.includes(String(email || "").toLowerCase());

const getSessionFromRequest = async (req) => {
  const token = req.cookies?.[Session.COOKIE_NAME];
  if (!token) return null;
  return Session.findByToken(token);
};

const protect = async (req, res, next) => {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return res.status(401).json({ success: false, message: "Not authorized, session expired or missing" });
    req.session = session;
    req.user = session.user;
    req.isAdmin = isAdminEmail(session.user.email);
    next();
  } catch (error) {
    console.error("Session authentication failed:", error.message);
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) return res.status(403).json({ success: false, message: "Admin access required" });
  next();
};

module.exports = { protect, requireAdmin, isAdminEmail, getSessionFromRequest };
