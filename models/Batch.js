/**
 * models/Batch.js
 * Off-chain record for every drug batch.
 * The blockchain is the source of truth for immutability;
 * MongoDB enables fast queries and dashboards.
 */

const mongoose = require("mongoose");

const VALID_STATES = [
  "RETURNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "RECEIVED",
  "UNDER_INSPECTION",
  "APPROVED_FOR_DISPOSAL",
  "DESTROYED",
];

// State machine — which transitions are legal
const TRANSITIONS = {
  RETURNED:               ["PICKED_UP"],
  PICKED_UP:              ["IN_TRANSIT"],
  IN_TRANSIT:             ["IN_TRANSIT", "RECEIVED"],
  RECEIVED:               ["UNDER_INSPECTION"],
  UNDER_INSPECTION:       ["APPROVED_FOR_DISPOSAL"],
  APPROVED_FOR_DISPOSAL:  ["DESTROYED"],
  DESTROYED:              [],
};

const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    drugName:         { type: String, required: true, trim: true },
    quantity:         { type: Number, required: true, min: 1 },
    expiryDate:       { type: Date },
    manufacturerCode: { type: String, trim: true },

    currentState: {
      type: String,
      enum: VALID_STATES,
      required: true,
    },

    // Who currently holds this batch
    currentActorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    currentActorRole: { type: String },

    // On-chain references (updated after each blockchain tx)
    txHashes:    [String],  // Ethereum tx hashes from each contract call
    contractBatchId: String,

    isTerminal:    { type: Boolean, default: false },
    anomalyFlag:   { type: Boolean, default: false },
    anomalyNote:   String,

    // Array of Transaction document IDs (history)
    history: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
  },
  { timestamps: true }
);

batchSchema.index({ batchId: 1 });
batchSchema.index({ currentState: 1 });
batchSchema.index({ drugName: "text" });

// Check if a state transition is allowed
batchSchema.statics.isTransitionValid = (from, to) => {
  if (!from) return to === "RETURNED";           // new batch
  return (TRANSITIONS[from] || []).includes(to);
};

batchSchema.statics.VALID_STATES = VALID_STATES;

module.exports = mongoose.model("Batch", batchSchema);
