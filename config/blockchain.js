/**
 * config/blockchain.js
 *
 * Initialises the ethers.js provider, backend signer wallet,
 * and the contract instance using your deployed address + ABI.
 *
 * HOW TO USE ANYWHERE IN THE PROJECT:
 *   const { getContract } = require("../config/blockchain");
 *   const contract = getContract();
 *   const tx = await contract.logReturn(batchId, drugName, qty, reason);
 *   await tx.wait();
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ─────────────────────────────────────────────────────────────────
// CONTRACT ABI
// After compiling with Hardhat (npx hardhat compile), open:
//   artifacts/contracts/PharmaChain.sol/PharmaChain.json
// Copy the full "abi" array and paste it below replacing the stubs.
// ─────────────────────────────────────────────────────────────────
const CONTRACT_ABI = [
  // ── WRITE functions (called by backend signer) ──────────────
  "function logReturn(string batchId, string drugName, uint256 quantity, string reason) external",
  "function confirmPickup(string batchId, uint256 quantityVerified) external",
  "function updateTransit(string batchId, string locationHash) external",
  "function confirmReceipt(string batchId, uint256 quantityReceived) external",
  "function approveForDisposal(string batchId, string approvalCode) external",
  "function certifyDestruction(string batchId, string method, string certificateHash) external",

  // ── READ functions (no gas, no signer needed) ────────────────
  "function getCurrentState(string batchId) external view returns (string)",
  "function getBatchHistory(string batchId) external view returns (tuple(string actor, string action, uint256 timestamp, string metaHash)[])",

  // ── EVENTS (used by event listeners) ────────────────────────
  "event ReturnLogged(string indexed batchId, address indexed actor, uint256 timestamp)",
  "event PickupConfirmed(string indexed batchId, address indexed actor, uint256 timestamp)",
  "event TransitUpdated(string indexed batchId, string locationHash, uint256 timestamp)",
  "event BatchReceived(string indexed batchId, address indexed actor, bool discrepancy)",
  "event DisposalApproved(string indexed batchId, string approvalCode, uint256 timestamp)",
  "event BatchDestroyed(string indexed batchId, address indexed agent, string method, string certHash)",
];

// ─── Module-level singletons (initialised once at startup) ───────
let _provider = null;
let _signer   = null;
let _contract = null;

/**
 * initBlockchain()
 * Call once in server.js before app.listen().
 * Reads RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS from .env
 */
async function initBlockchain() {
  const { RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

  if (!RPC_URL)          throw new Error("RPC_URL is missing from .env");
  if (!PRIVATE_KEY)      throw new Error("PRIVATE_KEY is missing from .env");
  if (!CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS is missing from .env");
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("⚠️  CONTRACT_ADDRESS is placeholder — update .env after deployment");
  }

  // Provider — reads from the blockchain node / RPC endpoint
  _provider = new ethers.JsonRpcProvider(RPC_URL);

  const network = await _provider.getNetwork();
  console.log(`  ✅ Blockchain: chainId ${network.chainId}`);

  // Signer — the backend wallet that PAYS GAS for write transactions
  _signer = new ethers.Wallet(PRIVATE_KEY, _provider);
  console.log(`  ✅ Signer: ${_signer.address}`);

  // Contract — write transactions use _signer, reads use _provider
  _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);
  console.log(`  ✅ Contract: ${CONTRACT_ADDRESS}`);

  return _contract;
}

/** Returns the contract instance. Throws if initBlockchain() wasn't called. */
function getContract() {
  if (!_contract) {
    throw new Error("Blockchain not initialised. Call initBlockchain() in server.js first.");
  }
  return _contract;
}

/** Returns ethers provider (for block/tx queries without gas) */
function getProvider() {
  if (!_provider) throw new Error("Blockchain not initialised.");
  return _provider;
}

/** Returns the signer wallet */
function getSigner() {
  if (!_signer) throw new Error("Blockchain not initialised.");
  return _signer;
}

module.exports = { initBlockchain, getContract, getProvider, getSigner };
