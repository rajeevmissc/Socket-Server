// utils/signature.util.js
import crypto from 'crypto';

/**
 * Validate Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Signature to validate
 * @param {string} secret - Razorpay webhook secret
 * @returns {boolean} True if signature is valid
 */
export const validateRazorpaySignature = (orderId, paymentId, signature, secret = null) => {
  const razorpaySecret = secret || process.env.RAZORPAY_KEY_SECRET;
  
  if (!razorpaySecret) {
    throw new Error('Razorpay secret key is not configured');
  }
  
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', razorpaySecret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
};

/**
 * Validate Razorpay webhook signature
 * @param {string} body - Webhook request body (stringified)
 * @param {string} signature - X-Razorpay-Signature header
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
export const validateWebhookSignature = (body, signature, secret = null) => {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Razorpay webhook secret is not configured');
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
};

/**
 * Generate signature for API requests
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {object} params - Request parameters
 * @param {string} secret - Secret key
 * @returns {string} Generated signature
 */
export const generateApiSignature = (method, url, params, secret) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringToSign = `${method.toUpperCase()}|${url}|${sortedParams}`;
  
  return crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('hex');
};

/**
 * Create secure hash for sensitive data
 * @param {string} data - Data to hash
 * @param {string} salt - Salt for hashing
 * @returns {string} Hashed data
 */
export const createSecureHash = (data, salt = null) => {
  const hashSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, hashSalt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash: `${hashSalt}:${hash}`,
    salt: hashSalt
  };
};

/**
 * Verify secure hash
 * @param {string} data - Original data
 * @param {string} storedHash - Stored hash (salt:hash format)
 * @returns {boolean} True if hash matches
 */
export const verifySecureHash = (data, storedHash) => {
  const [salt, hash] = storedHash.split(':');
  
  if (!salt || !hash) {
    return false;
  }
  
  const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

/**
 * Generate JWT-style signature for internal APIs
 * @param {object} payload - Data to sign
 * @param {string} secret - Secret key
 * @param {number} expiresIn - Expiration in seconds
 * @returns {string} Signed token
 */
export const generateInternalToken = (payload, secret, expiresIn = 3600) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Verify internal token signature
 * @param {string} token - Token to verify
 * @param {string} secret - Secret key
 * @returns {object|null} Decoded payload if valid, null otherwise
 */
export const verifyInternalToken = (token, secret) => {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode and verify payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }
    
    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * Generate checksum for data integrity
 * @param {string|object} data - Data to checksum
 * @returns {string} Checksum
 */
export const generateChecksum = (data) => {
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  
  return crypto
    .createHash('md5')
    .update(stringData)
    .digest('hex');
};

/**
 * Verify data integrity using checksum
 * @param {string|object} data - Data to verify
 * @param {string} expectedChecksum - Expected checksum
 * @returns {boolean} True if checksum matches
 */
export const verifyChecksum = (data, expectedChecksum) => {
  const actualChecksum = generateChecksum(data);
  return actualChecksum === expectedChecksum;
};

/**
 * Generate time-based one-time signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @param {number} timeWindow - Time window in seconds (default: 300)
 * @returns {object} Signature with timestamp
 */
export const generateTimeBasedSignature = (data, secret, timeWindow = 300) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const timeSlot = Math.floor(timestamp / timeWindow);
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${data}:${timeSlot}`)
    .digest('hex');
  
  return {
    signature,
    timestamp,
    timeSlot,
    expiresAt: (timeSlot + 1) * timeWindow
  };
};

/**
 * Verify time-based signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {number} timestamp - Original timestamp
 * @param {string} secret - Secret key
 * @param {number} timeWindow - Time window in seconds
 * @returns {boolean} True if signature is valid and not expired
 */
export const verifyTimeBasedSignature = (data, signature, timestamp, secret, timeWindow = 300) => {
  const currentTime = Math.floor(Date.now() / 1000);
  const originalTimeSlot = Math.floor(timestamp / timeWindow);
  const currentTimeSlot = Math.floor(currentTime / timeWindow);
  
  // Allow current and previous time slots for clock skew
  const validTimeSlots = [currentTimeSlot, currentTimeSlot - 1];
  
  return validTimeSlots.some(timeSlot => {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${data}:${timeSlot}`)
      .digest('hex');
    
    return expectedSignature === signature;
  });
};

/**
 * Safe signature comparison to prevent timing attacks
 * @param {string} signature1 - First signature
 * @param {string} signature2 - Second signature
 * @returns {boolean} True if signatures match
 */
export const safeSignatureCompare = (signature1, signature2) => {
  if (signature1.length !== signature2.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature1.length; i++) {
    result |= signature1.charCodeAt(i) ^ signature2.charCodeAt(i);
  }
  
  return result === 0;
};

export default {
  validateRazorpaySignature,
  validateWebhookSignature,
  generateApiSignature,
  createSecureHash,
  verifySecureHash,
  generateInternalToken,
  verifyInternalToken,
  generateChecksum,
  verifyChecksum,
  generateTimeBasedSignature,
  verifyTimeBasedSignature,
  safeSignatureCompare
};