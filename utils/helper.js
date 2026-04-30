/**
 * utils/helper.js
 * Shared utility functions used across the project.
 */

/**
 * Standard success response shape.
 * Usage: return sendSuccess(res, 200, "Done", { key: value });
 */
function sendSuccess(res, statusCode = 200, message = "Success", data = null) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
}

/**
 * Standard error response shape.
 * Usage: return sendError(res, 400, "Bad input");
 */
function sendError(res, statusCode = 500, message = "An error occurred", details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

/**
 * Validate that a string looks like a valid Ethereum address.
 * Does NOT check checksum — just format.
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate that a string looks like an Ethereum tx hash.
 */
function isValidTxHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Converts a BigInt (returned by ethers.js from Solidity uint256) to a JS Number.
 * Safe for timestamps and quantities (not for very large token amounts).
 */
function bigIntToNumber(value) {
  return Number(value);
}

/**
 * Deep-clean an object to remove undefined and null fields.
 */
function cleanObject(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => (val === null || val === undefined ? undefined : val))
  );
}

/**
 * Sleep for a given number of milliseconds. Useful for retry logic.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  sendSuccess,
  sendError,
  isValidAddress,
  isValidTxHash,
  bigIntToNumber,
  cleanObject,
  sleep,
};
