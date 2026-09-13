const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Session = require("../models/Session");
const PasswordResetToken = require("../models/PasswordResetToken");
const { env } = require("../config/env");
const { isAdminEmail, getSessionFromRequest } = require("../middleware/authMiddleware");

const OAUTH_COOKIE = "se_oauth_state";
const OAUTH_COOKIE_MAX_AGE = 10 * 60 * 1000;
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

const publicUser = (user) => ({
  id: user._id ?? user.id,
  fullName: user.fullName,
  email: user.email,
  avatarUrl: user.avatarUrl || null,
  authProvider: user.authProvider || "local",
  isAdmin: isAdminEmail(user.email),
});

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  // The production frontend (Vercel) and API (Render) are different sites.
  // Lax cookies are not sent with cross-site fetch/XHR requests, so the
  // session would be created during login and immediately appear missing on
  // the next /api/auth/me request.
  sameSite: env.isProd ? "none" : "lax",
  maxAge: env.sessionTtlSeconds * 1000,
  path: "/api",
});

const setSessionCookie = async (res, userId) => {
  const session = await Session.create(userId);
  res.cookie(Session.COOKIE_NAME, session.token, cookieOptions());
  return session;
};

const clearSessionCookie = (res) => res.clearCookie(Session.COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });

const clientRedirect = (path) => {
  const base = env.allowedOrigins[0] || "";
  return `${base}${path}`;
};

const redirectError = (res, code) => res.redirect(clientRedirect(`/login?error=${encodeURIComponent(code)}`));

const normalizedEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const normalizedName = typeof fullName === "string" ? fullName.trim() : "";
    const normalized = normalizedEmail(email);
    if (!normalizedName || !normalized || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (await User.findByEmail(normalized)) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName: normalizedName, email: normalized, password: hashedPassword });
    await setSessionCookie(res, user._id);
    return res.status(201).json({ success: true, message: "User registered successfully", user: publicUser(user) });
  } catch (error) {
    console.error("Register Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalized = normalizedEmail(email);
    if (!normalized || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }
    const user = await User.findByEmail(normalized);
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    await setSessionCookie(res, user._id);
    return res.status(200).json({ success: true, message: "Login successful", user: publicUser(user) });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findSafeById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("Get Me Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Revoke the current server session
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.[Session.COOKIE_NAME];
    await Session.revoke(token);
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    console.error("Logout Error:", error.message);
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: "Logged out" });
  }
};

// @desc    Update user profile (name and/or password)
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { fullName, currentPassword, newPassword } = req.body;
    let hashedPassword;
    const changingPassword = Boolean(currentPassword || newPassword);
    if (changingPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current and new passwords are required" });
      }
      if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ success: false, message: "Current password is incorrect" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
      }
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    const updated = await User.update(user._id, {
      fullName: typeof fullName === "string" && fullName.trim() ? fullName.trim() : undefined,
      password: hashedPassword,
    });

    if (changingPassword) {
      await Session.revokeAllForUser(user._id);
      await setSessionCookie(res, user._id);
    }
    return res.status(200).json({ success: true, message: "Profile updated successfully", user: publicUser(updated) });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const googleClient = () => new OAuth2Client(env.googleClientId, env.googleClientSecret, env.googleCallbackUrl);

const startGoogle = async (req, res, mode = "login") => {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleCallbackUrl) return redirectError(res, "oauth_unavailable");
  if (mode === "link" && !req.user) return redirectError(res, "oauth_login_required");

  const state = crypto.randomBytes(32).toString("base64url");
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const signedState = Buffer.from(JSON.stringify({ state, codeVerifier, mode }), "utf8").toString("base64url");
  res.cookie(OAUTH_COOKIE, signedState, {
    httpOnly: true,
    signed: true,
    secure: env.isProd,
    sameSite: "lax",
    maxAge: OAUTH_COOKIE_MAX_AGE,
    path: "/api/auth/google",
  });

  const url = googleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return res.redirect(url);
};

exports.startGoogle = (req, res) => startGoogle(req, res, "login");
exports.startGoogleLink = (req, res) => startGoogle(req, res, "link");

exports.googleCallback = async (req, res) => {
  try {
    const saved = req.signedCookies?.[OAUTH_COOKIE];
    res.clearCookie(OAUTH_COOKIE, { signed: true, secure: env.isProd, sameSite: "lax", path: "/api/auth/google" });
    if (req.query.error) return redirectError(res, "oauth_cancelled");
    if (!saved) return redirectError(res, "oauth_state_missing");

    const state = JSON.parse(Buffer.from(saved, "base64url").toString("utf8"));
    if (!state.state || state.state !== req.query.state || !state.codeVerifier) return redirectError(res, "oauth_state_mismatch");

    const client = googleClient();
    const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: state.codeVerifier });
    if (!tokens.id_token) throw new Error("Google did not return an ID token");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId });
    const payload = ticket.getPayload();
    if (!payload || !GOOGLE_ISSUERS.has(payload.iss) || !payload.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Google identity validation failed");
    }

    const email = normalizedEmail(payload.email);
    const currentSession = await getSessionFromRequest(req);
    let user = await User.findByGoogleId(payload.sub);

    if (state.mode === "link") {
      if (!currentSession) return redirectError(res, "oauth_login_required");
      if (user && user._id !== currentSession.user._id) return redirectError(res, "google_already_linked");
      if (email !== currentSession.user.email) return redirectError(res, "oauth_email_mismatch");
      user = await User.linkGoogle(currentSession.user._id, { googleId: payload.sub, avatarUrl: payload.picture });
      return res.redirect(clientRedirect("/profile?linked=google"));
    }

    if (!user) {
      const existing = await User.findByEmail(email);
      if (existing) return redirectError(res, "account_exists");
      // Keep the existing NOT NULL password invariant. This random hash cannot
      // be used as a password and the account is explicitly Google-owned.
      const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString("base64url"), 10);
      user = await User.create({
        fullName: payload.name || email.split("@")[0],
        email,
        password: unusablePassword,
        authProvider: "google",
        googleId: payload.sub,
        avatarUrl: payload.picture,
      });
    }

    await setSessionCookie(res, user._id);
    return res.redirect(clientRedirect("/dashboard"));
  } catch (error) {
    console.error("Google OAuth callback failed:", error.message);
    return redirectError(res, "oauth_failed");
  }
};

// Password reset delivery is intentionally provider-backed. Without a webhook
// configured, no token is generated or exposed and the response remains generic.
exports.requestPasswordReset = async (req, res) => {
  const email = normalizedEmail(req.body?.email);
  try {
    const user = await User.findByEmail(email);
    if (user && user.authProvider === "local" && PasswordResetToken.isDeliveryConfigured()) {
      const reset = await PasswordResetToken.create(user._id);
      const resetUrl = clientRedirect(`/reset-password?token=${encodeURIComponent(reset.token)}`);
      await fetch(env.passwordResetWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, fullName: user.fullName, resetUrl, expiresAt: reset.expiresAt }),
      }).then((response) => {
        if (!response.ok) throw new Error(`password reset delivery returned ${response.status}`);
      });
    }
  } catch (error) {
    console.error("Password reset delivery failed:", error.message);
  }
  return res.status(202).json({ success: true, message: "If an account exists and email delivery is configured, reset instructions will be sent." });
};

exports.resetPassword = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!token || password.length < 8) return res.status(400).json({ success: false, message: "Invalid or expired reset request" });
  const reset = await PasswordResetToken.findValid(token);
  if (!reset) return res.status(400).json({ success: false, message: "Invalid or expired reset request" });
  const passwordHash = await bcrypt.hash(password, 10);
  const consumed = await PasswordResetToken.consume(reset.id);
  if (!consumed) return res.status(400).json({ success: false, message: "Invalid or expired reset request" });
  await User.update(reset.user_id, { password: passwordHash });
  await Session.revokeAllForUser(reset.user_id);
  clearSessionCookie(res);
  return res.status(200).json({ success: true, message: "Password reset successfully" });
};
