// utils/otp.js
import crypto from 'crypto';

/**
 * Generate a random 6-digit numeric OTP
 * @returns {string} e.g. "482917"
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash an OTP using SHA-256 for safe storage in DB
 * @param {string} otp - plain OTP
 * @returns {string} hex hash
 */
export const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify a plain OTP against a stored hash
 * @param {string} plainOTP  - user-submitted OTP
 * @param {string} hashedOTP - stored hash from DB
 * @returns {boolean}
 */
export const verifyOTP = (plainOTP, hashedOTP) => {
  const hash = crypto.createHash('sha256').update(plainOTP).digest('hex');
  return hash === hashedOTP;
};