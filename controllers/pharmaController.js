/**
 * controllers/pharmaController.js
 *
 * All core pharma logistics actions.
 * Every write: validates → updates MongoDB → writes to blockchain → saves tx hash.
 * Every read:  queries MongoDB (fast) + optionally verifies against chain.
 */

const { v4: uuidv4 } = require("uuid");
const { getContract }     = require("../config/blockchain");
const Batch               = require("../models/Batch");
const Transaction         = require("../models/Transaction");
const { validateActionRole } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: wrap a blockchain call with proper error handling
// ─────────────────────────────────────────────────────────────────────────────
async function sendToChain(contractFn, args = []) {
  const contract = getContract();
  const tx = await contract[contractFn](...args);
  const receipt = await tx.wait();   // waits for 1 confirmation
  return {
    txHash:      tx.hash,
    blockNumber: receipt.blockNumber,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pharma/batch
// Universal "submit an action on a batch" endpoint.
// Body: { batchId, actionType, drugName?, quantity, reason?, location?, metadata? }
// ─────────────────────────────────────────────────────────────────────────────
exports.submitAction = async (req, res, next) => {
  try {
    const {
      batchId,
      actionType,
      drugName,
      quantity,
      reason = "",
      location = {},
      metadata = {},
    } = req.body;
    const actor = req.user;

    // 1. Role-action guard
    const roleCheck = validateActionRole(actor.role, actionType);
    if (!roleCheck.ok) {
      return res.status(403).json({ error: roleCheck.message });
    }

    // 2. Quantity must be positive
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }

    // 3. Find or create the batch record
    let batch = await Batch.findOne({ batchId });

    if (!batch) {
      // Only RETURNED can start a new batch
      if (actionType !== "RETURNED") {
        return res.status(404).json({ error: `Batch ${batchId} not found` });
      }
      if (!drugName) {
        return res.status(400).json({ error: "drugName is required when logging a new return" });
      }
      batch = new Batch({
        batchId,
        drugName,
        quantity,
        currentState: null,
        expiryDate: metadata.expiryDate,
        manufacturerCode: metadata.manufacturerCode,
      });
    }

    // 4. State machine check
    if (!Batch.isTransitionValid(batch.currentState, actionType)) {
      return res.status(409).json({
        error: `Invalid transition: "${batch.currentState}" → "${actionType}"`,
      });
    }

    // 5. Write to blockchain ─────────────────────────────────────────────────
    let txHash, blockNumber;

    try {
      switch (actionType) {
        case "RETURNED":
          ({ txHash, blockNumber } = await sendToChain("logReturn", [
            batchId,
            drugName || batch.drugName,
            quantity,
            reason,
          ]));
          break;

        case "PICKED_UP":
          ({ txHash, blockNumber } = await sendToChain("confirmPickup", [
            batchId,
            quantity,
          ]));
          break;

        case "IN_TRANSIT":
          ({ txHash, blockNumber } = await sendToChain("updateTransit", [
            batchId,
            JSON.stringify(location),
          ]));
          break;

        case "RECEIVED":
          ({ txHash, blockNumber } = await sendToChain("confirmReceipt", [
            batchId,
            quantity,
          ]));
          break;

        case "UNDER_INSPECTION":
          // Inspection note — write as a transit update or custom function if your contract has one
          ({ txHash, blockNumber } = await sendToChain("updateTransit", [
            batchId,
            JSON.stringify({ stage: "INSPECTION", notes: metadata.inspectionNotes }),
          ]));
          break;

        case "APPROVED_FOR_DISPOSAL":
          ({ txHash, blockNumber } = await sendToChain("approveForDisposal", [
            batchId,
            metadata.approvalCode || "APPROVED",
          ]));
          break;

        case "DESTROYED":
          ({ txHash, blockNumber } = await sendToChain("certifyDestruction", [
            batchId,
            metadata.destructionMethod || "INCINERATION",
            metadata.certificateHash  || "",
          ]));
          break;

        default:
          return res.status(400).json({ error: `Unknown actionType: ${actionType}` });
      }
    } catch (chainErr) {
      console.error("Blockchain write failed:", chainErr);
      return res.status(502).json({
        error: "Blockchain transaction failed",
        detail: chainErr.reason || chainErr.message,
      });
    }

    // 6. Save Transaction record to MongoDB ──────────────────────────────────
    const txnDoc = await Transaction.create({
      transactionId: uuidv4(),
      batchId,
      actorId:    actor._id,
      actorRole:  actor.role,
      actionType,
      quantity,
      reason,
      location,
      metadata,
      txHash,
      blockNumber,
      isConfirmed: true,
      serverTimestamp: new Date(),
    });

    // 7. Update Batch record ──────────────────────────────────────────────────
    batch.currentState    = actionType;
    batch.currentActorId  = actor._id;
    batch.currentActorRole = actor.role;
    batch.isTerminal      = actionType === "DESTROYED";
    batch.txHashes.push(txHash);
    batch.history.push(txnDoc._id);
    await batch.save();

    // 8. Respond ─────────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: `Action "${actionType}" recorded on blockchain`,
      data: {
        transactionId: txnDoc.transactionId,
        batchId,
        actionType,
        txHash,
        blockNumber,
        timestamp: txnDoc.serverTimestamp,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pharma/batch/:batchId
// Returns full lifecycle history of a batch from MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
exports.getBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findOne({ batchId: batchId.toUpperCase() })
      .populate("history")
      .populate("currentActorId", "name email role organizationName");

    if (!batch) {
      return res.status(404).json({ error: `Batch ${batchId} not found` });
    }

    // Optional: cross-check current state with blockchain
    let chainState = null;
    try {
      const contract = getContract();
      chainState = await contract.getCurrentState(batchId);
    } catch (_) {
      // Non-fatal — we still return MongoDB data
    }

    return res.json({
      success: true,
      data: {
        batch,
        chainState,
        chainMatch: chainState ? chainState === batch.currentState : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pharma/batches
// List all batches (with optional filter ?state=RETURNED&page=1&limit=20)
// ─────────────────────────────────────────────────────────────────────────────
exports.listBatches = async (req, res, next) => {
  try {
    const { state, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (state) filter.currentState = state;

    // Regulators/Admins see all; others see only their own batches
    if (!["REGULATOR", "ADMIN"].includes(req.user.role)) {
      filter.currentActorId = req.user._id;
    }

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("currentActorId", "name role"),
      Batch.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { batches, total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pharma/batch/:batchId/chain
// Fetches the on-chain history directly from the smart contract.
// ─────────────────────────────────────────────────────────────────────────────
exports.getChainHistory = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const contract = getContract();

    const history = await contract.getBatchHistory(batchId.toUpperCase());

    // Convert BigInt timestamps to strings for JSON serialisation
    const formatted = history.map((entry) => ({
      actor:     entry.actor,
      action:    entry.action,
      timestamp: entry.timestamp.toString(),
      metaHash:  entry.metaHash,
    }));

    return res.json({ success: true, batchId, chainHistory: formatted });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pharma/tx/:txHash
// Look up an Ethereum transaction receipt directly from the chain.
// ─────────────────────────────────────────────────────────────────────────────
exports.getTxReceipt = async (req, res, next) => {
  try {
    const { getProvider } = require("../config/blockchain");
    const receipt = await getProvider().getTransactionReceipt(req.params.txHash);
    if (!receipt) return res.status(404).json({ error: "Transaction not found on chain" });
    return res.json({ success: true, receipt });
  } catch (err) {
    next(err);
  }
};
