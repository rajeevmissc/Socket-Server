// ---- Imports ----
import express from 'express';
import {
  sendOTPController,
  verifyOTPController,
  resendOTPController,
  logoutController,
  logoutAllController
} from '../controllers/authController.js';

import {
  validateSendOTP,
  validateVerifyOTP
} from '../middleware/validationMiddleware.js';

import { authenticateToken } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimitMiddleware.js';

// ---- Router ----
const router = express.Router();

// ---- Public routes ----
router.post('/send-otp', rateLimiter.otp, validateSendOTP, sendOTPController);
router.post('/verify-otp', rateLimiter.login, validateVerifyOTP, verifyOTPController);
router.post('/resend-otp', rateLimiter.otp, resendOTPController);

// ---- Private routes ----
router.post('/logout', authenticateToken, logoutController);
router.post('/logout-all', authenticateToken, logoutAllController);

// ---- Export ----
export default router;
