// middleware/rateLimitMiddleware.js
import rateLimit from 'express-rate-limit';

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 'Please wait 15 minutes before making another request'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// OTP specific rate limiting
const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX_REQUESTS) || 3,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later.',
    retryAfter: 'Please wait 1 minute before requesting another OTP'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for resend requests with valid session
    return req.path.includes('resend') && req.headers.authorization;
  }
});

// Login attempts rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
    retryAfter: 'Account temporarily locked. Please wait 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Registration rate limiting
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.',
    retryAfter: 'Please wait 1 hour before creating another account'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const rateLimiter = {
  general: generalLimiter,
  otp: otpLimiter,
  login: loginLimiter,
  register: registerLimiter
};
