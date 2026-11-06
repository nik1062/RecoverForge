const crypto = require('crypto');

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Range: 100000 - 999999 inclusive.
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = { generateOTP };
