import express from 'express';
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  getFeedbackStats,
  updateFeedbackStatus,
  deleteFeedback
} from '../controllers/feedbackController.js';

const router = express.Router();

// Public routes
router.post('/', createFeedback);
router.get('/', getAllFeedback);
router.get('/stats/:providerId', getFeedbackStats);
router.get('/:id', getFeedbackById);

// Admin routes (you can add authentication middleware here)
router.patch('/:id/status', updateFeedbackStatus);
router.delete('/:id', deleteFeedback);

export default router;
