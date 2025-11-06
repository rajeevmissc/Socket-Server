import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a secure random OTP (alternative method)
 * @returns {string} 6-digit OTP
 */
export const generateSecureOTP = () => {
  const buffer = crypto.randomBytes(3);
  const otp = parseInt(buffer.toString('hex'), 16) % 1000000;
  return otp.toString().padStart(6, '0');
};

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      timestamp: Date.now(),
      tokenType: 'access'
    },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
      issuer: 'ServiceConnect',
      audience: 'ServiceConnect-Mobile'
    }
  );
};

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      timestamp: Date.now(),
      tokenType: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret-key',
    { 
      expiresIn: '90d',
      issuer: 'ServiceConnect',
      audience: 'ServiceConnect-Mobile'
    }
  );
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Generate a secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a password or sensitive data
 * @param {string} data - Data to hash
 * @param {number} rounds - Bcrypt rounds (default: 12)
 * @returns {Promise<string>} Hashed data
 */
export const hashData = async (data, rounds = 12) => {
  return await bcrypt.hash(data, rounds);
};

/**
 * Compare data with hash
 * @param {string} data - Plain data
 * @param {string} hash - Hashed data
 * @returns {Promise<boolean>} Comparison result
 */
export const compareData = async (data, hash) => {
  return await bcrypt.compare(data, hash);
};
