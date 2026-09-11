const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { isAdminEmail } = require("../middleware/authMiddleware");

const signToken = (userId) => jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: "7d" });

const publicUser = (user) => ({ id: user._id, fullName: user.fullName, email: user.email, isAdmin: isAdminEmail(user.email) });

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const normalizedName = typeof fullName === "string" ? fullName.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (await User.findOne(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = await User.create({ fullName: normalizedName, email: normalizedEmail, password: hashedPassword });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    const user = await User.findOne(normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findSafeById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("Get Me Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update user profile (name and/or password)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { fullName, currentPassword, newPassword } = req.body;
    let hashedPassword;

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current and new passwords are required" });
      }
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ success: false, message: "Current password is incorrect" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
      }
      hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    }

    const updated = await User.update(user._id, {
      fullName: typeof fullName === "string" && fullName.trim() ? fullName.trim() : undefined,
      password: hashedPassword,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(updated),
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
