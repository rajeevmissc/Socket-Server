// utils/errorUtils.js - Error handling utilities

// Custom AppError class
export class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array} errors - Detailed error array
 * @returns {object} Error response object
 */
export const createError = (message, statusCode = 500, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    errors,
    timestamp: new Date().toISOString()
  };
};

/**
 * Handle MongoDB validation errors
 * @param {object} error - MongoDB validation error
 * @returns {object} Formatted error response
 */
export const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));

  return createError('Validation failed', 400, errors);
};

/**
 * Handle MongoDB duplicate key errors
 * @param {object} error - MongoDB duplicate key error
 * @returns {object} Formatted error response
 */
export const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  
  return createError(`${field} '${value}' already exists`, 409, [{
    field,
    message: `${field} must be unique`,
    value
  }]);
};

/**
 * Handle MongoDB cast errors
 * @param {object} error - MongoDB cast error
 * @returns {object} Formatted error response
 */
export const handleCastError = (error) => {
  return createError(`Invalid ${error.path}: ${error.value}`, 400);
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 */
export const logError = (error, context = {}) => {
  console.error('=== ERROR LOG ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('Context:', JSON.stringify(context, null, 2));
  console.error('================');
};
