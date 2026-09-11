const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { env } = require("../config/env");

const isAdminEmail = (email) => env.adminEmails.includes(String(email || "").toLowerCase());

const protect = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith("Bearer")) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, env.jwtSecret);
    // safeUser: no password hash on req.user.
    const user = await User.findSafeById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    req.user = user;
    req.isAdmin = isAdminEmail(user.email);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) return res.status(403).json({ success: false, message: "Admin access required" });
  next();
};

module.exports = { protect, requireAdmin, isAdminEmail };
