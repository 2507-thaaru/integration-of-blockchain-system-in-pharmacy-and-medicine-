/**
 * middleware/authMiddleware.js
 *
 * authenticate  — verifies JWT, attaches req.user
 * roleGuard     — checks req.user.role against allowed roles
 */

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verifies Bearer token from Authorization header.
 * Attaches the full user document to req.user on success.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token — please log in" });
    }

    const token = header.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({
        error: e.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Factory — call with the roles that are allowed.
 * Must come AFTER authenticate() in the middleware chain.
 *
 * Usage:
 *   router.post("/add", authenticate, roleGuard("PHARMACY"), handler)
 *   router.get("/all",  authenticate, roleGuard("ADMIN", "REGULATOR"), handler)
 */
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires: ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
}

// Which role is allowed to submit each actionType
const ACTION_ROLE_MAP = {
  RETURNED:               ["PHARMACY"],
  PICKED_UP:              ["DISTRIBUTOR"],
  IN_TRANSIT:             ["DISTRIBUTOR"],
  RECEIVED:               ["MANUFACTURER"],
  UNDER_INSPECTION:       ["MANUFACTURER"],
  APPROVED_FOR_DISPOSAL:  ["MANUFACTURER"],
  DESTROYED:              ["DISPOSAL_AGENT"],
};

/**
 * Validates that the logged-in user's role matches the submitted action.
 * Returns { ok: true } or { ok: false, message: "..." }
 */
function validateActionRole(userRole, actionType) {
  const allowed = ACTION_ROLE_MAP[actionType];
  if (!allowed) return { ok: false, message: `Unknown actionType: ${actionType}` };
  if (!allowed.includes(userRole)) {
    return { ok: false, message: `Role "${userRole}" cannot perform "${actionType}". Need: ${allowed.join(", ")}` };
  }
  return { ok: true };
}

module.exports = { authenticate, roleGuard, validateActionRole, ACTION_ROLE_MAP };
