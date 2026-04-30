/**
 * controllers/authController.js
 * Register, login, and get current user profile.
 */

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

// POST /api/auth/register  (Admin only in production — open for dev)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organizationName, walletAddress } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password and role are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const user = await User.create({
      name,
      email,
      passwordHash: password,   // pre-save hook hashes it
      role,
      organizationName,
      walletAddress,
    });

    const token = generateToken(user._id);
    return res.status(201).json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    return res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// PATCH /api/auth/wallet
// Called when user connects MetaMask on the frontend
exports.linkWallet = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid Ethereum wallet address" });
    }
    req.user.walletAddress = walletAddress.toLowerCase();
    await req.user.save();
    return res.json({ success: true, message: "Wallet linked", walletAddress });
  } catch (err) {
    next(err);
  }
};
