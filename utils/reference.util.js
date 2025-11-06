// utils/reference.util.js
import crypto from 'crypto';

/**
 * Generate unique reference for transactions and payments
 * @param {string} type - Type of reference (credit, debit, payment, refund)
 * @param {string} prefix - Optional custom prefix
 * @returns {string} Unique reference string
 */
export const generateReference = (type, prefix = null) => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  let refPrefix = prefix;
  if (!refPrefix) {
    switch (type) {
      case 'credit':
        refPrefix = 'TXN';
        break;
      case 'debit':
        refPrefix = 'SRV';
        break;
      case 'payment':
        refPrefix = 'PAY';
        break;
      case 'refund':
        refPrefix = 'RFD';
        break;
      default:
        refPrefix = 'REF';
    }
  }
  
  // Format: PREFIX + Last 6 digits of timestamp + Random hex
  return `${refPrefix}${timestamp.slice(-6)}${random}`;
};

/**
 * Generate order ID for payment gateways
 * @param {string} userId - User ID
 * @returns {string} Order ID
 */
export const generateOrderId = (userId) => {
  const timestamp = Date.now().toString();
  const userHash = crypto.createHash('md5').update(userId.toString()).digest('hex').slice(0, 6).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `ORD${timestamp.slice(-8)}${userHash}${random}`;
};

/**
 * Generate receipt ID for Razorpay
 * @param {string} type - Type of transaction
 * @returns {string} Receipt ID
 */
export const generateReceiptId = (type = 'wallet') => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  return `${type.toUpperCase()}_${timestamp.slice(-8)}_${random}`;
};

/**
 * Validate reference format
 * @param {string} reference - Reference to validate
 * @returns {boolean} True if valid format
 */
export const validateReferenceFormat = (reference) => {
  if (!reference || typeof reference !== 'string') return false;
  
  // Should be at least 9 characters: PREFIX + 6 digits + 2+ random
  if (reference.length < 9) return false;
  
  // Should start with known prefixes
  const validPrefixes = ['TXN', 'SRV', 'PAY', 'RFD', 'REF', 'ORD'];
  const hasValidPrefix = validPrefixes.some(prefix => reference.startsWith(prefix));
  
  return hasValidPrefix;
};

/**
 * Extract information from reference
 * @param {string} reference - Reference to parse
 * @returns {object} Parsed information
 */
export const parseReference = (reference) => {
  if (!validateReferenceFormat(reference)) {
    throw new Error('Invalid reference format');
  }
  
  const prefix = reference.substring(0, 3);
  const timestampPart = reference.substring(3, 9);
  const randomPart = reference.substring(9);
  
  return {
    prefix,
    type: getReferenceType(prefix),
    timestampPart,
    randomPart,
    isValid: true
  };
};

/**
 * Get reference type from prefix
 * @param {string} prefix - Reference prefix
 * @returns {string} Type
 */
const getReferenceType = (prefix) => {
  switch (prefix) {
    case 'TXN': return 'credit';
    case 'SRV': return 'debit';
    case 'PAY': return 'payment';
    case 'RFD': return 'refund';
    case 'ORD': return 'order';
    default: return 'unknown';
  }
};

/**
 * Generate batch reference for bulk operations
 * @param {string} type - Batch type
 * @param {number} count - Number of items in batch
 * @returns {string} Batch reference
 */
export const generateBatchReference = (type, count) => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `BATCH_${type.toUpperCase()}_${timestamp.slice(-8)}_${count}_${random}`;
};

/**
 * Check if reference is duplicate
 * @param {string} reference - Reference to check
 * @param {Function} checkFunction - Function to check database
 * @returns {Promise<boolean>} True if duplicate
 */
export const isDuplicateReference = async (reference, checkFunction) => {
  try {
    const exists = await checkFunction(reference);
    return !!exists;
  } catch (error) {
    console.error('Error checking duplicate reference:', error);
    return true; // Assume duplicate to be safe
  }
};

/**
 * Generate unique reference with duplicate check
 * @param {string} type - Reference type
 * @param {Function} checkFunction - Function to check database
 * @param {number} maxAttempts - Maximum attempts to generate unique ref
 * @returns {Promise<string>} Unique reference
 */
export const generateUniqueReference = async (type, checkFunction, maxAttempts = 5) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const reference = generateReference(type);
    
    const isDuplicate = await isDuplicateReference(reference, checkFunction);
    if (!isDuplicate) {
      return reference;
    }
    
    if (attempt === maxAttempts) {
      throw new Error('Failed to generate unique reference after maximum attempts');
    }
    
    // Add small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

/**
 * Format reference for display
 * @param {string} reference - Reference to format
 * @returns {string} Formatted reference
 */
export const formatReferenceForDisplay = (reference) => {
  if (!reference) return '';
  
  try {
    const parsed = parseReference(reference);
    return `${parsed.prefix}-${parsed.timestampPart}-${parsed.randomPart}`;
  } catch {
    return reference; // Return as-is if parsing fails
  }
};

export default {
  generateReference,
  generateOrderId,
  generateReceiptId,
  validateReferenceFormat,
  parseReference,
  generateBatchReference,
  isDuplicateReference,
  generateUniqueReference,
  formatReferenceForDisplay
};