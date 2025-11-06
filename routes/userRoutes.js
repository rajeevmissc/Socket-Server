// ---- Imports ----
import express from 'express';
import {
  getProfileController,
  updateProfileController,
  getSessionsController,
  terminateSessionController,
  deleteAccountController,
  getUserStatsController
} from '../controllers/userController.js';

import { validateUpdateProfile } from '../middleware/validationMiddleware.js';
import { authenticateToken, requireVerification } from '../middleware/authMiddleware.js';

// ---- Router ----
const router = express.Router();

// ---- All user routes require authentication ----
router.use(authenticateToken);

// ---- Profile routes ----
router.get('/profile', getProfileController);
router.put('/profile', requireVerification, validateUpdateProfile, updateProfileController);

// ---- Session management routes ----
router.get('/sessions', getSessionsController);
router.delete('/sessions/:sessionId', terminateSessionController);

// ---- Account management routes ----
router.get('/stats', getUserStatsController);
router.delete('/account', requireVerification, deleteAccountController);

// ---- Export ----
export default router;
