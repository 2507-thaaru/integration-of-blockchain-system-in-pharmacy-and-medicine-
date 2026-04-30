/**
 * routes/pharmaRoutes.js
 * All pharma logistics endpoints.
 * Base path: /api/pharma  (set in server.js)
 */

const express = require("express");
const router  = express.Router();

const {
  submitAction,
  getBatch,
  listBatches,
  getChainHistory,
  getTxReceipt,
} = require("../controllers/pharmaController");

const { authenticate, roleGuard } = require("../middleware/authMiddleware");

// All routes below require a valid JWT
router.use(authenticate);

// ── Submit any lifecycle action (return, pickup, transit, receipt, dispose) ──
// Body: { batchId, actionType, quantity, drugName?, reason?, location?, metadata? }
router.post(
  "/batch",
  roleGuard("PHARMACY", "DISTRIBUTOR", "MANUFACTURER", "DISPOSAL_AGENT"),
  submitAction
);

// ── Get full batch record + history ─────────────────────────────────────────
router.get("/batch/:batchId", getBatch);

// ── List all batches (paginated, filterable) ────────────────────────────────
router.get("/batches", listBatches);

// ── Get raw on-chain history for a batch ────────────────────────────────────
router.get(
  "/batch/:batchId/chain",
  roleGuard("REGULATOR", "ADMIN", "MANUFACTURER"),
  getChainHistory
);

// ── Look up an Ethereum tx receipt ──────────────────────────────────────────
router.get(
  "/tx/:txHash",
  roleGuard("REGULATOR", "ADMIN"),
  getTxReceipt
);

module.exports = router;
