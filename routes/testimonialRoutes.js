// routes/testimonialRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  createTestimonial,
  getTestimonials,
  getMyTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
  getAllTestimonialsAdmin,
  approveTestimonial,
  rejectTestimonial
} from '../controllers/testimonialController.js';
import { authenticateToken, requireVerification } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware
const testimonialValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('service')
    .notEmpty()
    .withMessage('Service is required')
    .isIn([
      'Event Companion',
      'Childcare',
      'Culinary Service',
      'Elder Care',
      'Education Support',
      'Transportation',
      'Fitness Coaching',
      'Event Planning',
      'Home Organization',
      'Other'
    ])
    .withMessage('Invalid service type'),
  body('testimonialText')
    .notEmpty()
    .withMessage('Testimonial text is required')
    .isLength({ min: 50, max: 500 })
    .withMessage('Testimonial must be between 50 and 500 characters'),
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim()
];

// ----------------------
// Public routes
// ----------------------
router.get('/', getTestimonials);
router.get('/:id', getTestimonialById);

// ----------------------
// Protected routes
// ----------------------
router.post('/create', authenticateToken, requireVerification, testimonialValidation, createTestimonial);
router.get('/my/testimonials', authenticateToken, getMyTestimonials);
router.put('/:id', authenticateToken, testimonialValidation, updateTestimonial);
router.delete('/:id', authenticateToken, deleteTestimonial);

// ----------------------
// Admin routes
// Note: Here you need to manually check admin role inside controller
// ----------------------
router.get('/admin/all', authenticateToken, getAllTestimonialsAdmin);
router.patch('/admin/:id/approve', authenticateToken, approveTestimonial);
router.patch('/admin/:id/reject', authenticateToken, rejectTestimonial);

export default router;
