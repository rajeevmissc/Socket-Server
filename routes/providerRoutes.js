import express from 'express';
import { body } from 'express-validator';
import {
  createProvider,
  getAllProviders,
  getProviderById,
  updateProvider,
  deleteProvider
} from '../controllers/providerController.js';

const router = express.Router();

// Validation middleware for creating provider
const providerValidation = [
  body('personalInfo.firstName').trim().notEmpty().withMessage('First name is required'),
  body('personalInfo.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('personalInfo.email').isEmail().withMessage('Valid email is required'),
  body('personalInfo.phone').notEmpty().withMessage('Phone number is required'),
  body('personalInfo.dateOfBirth').isDate().withMessage('Valid date of birth is required'),
  body('personalInfo.gender').isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required'),
  body('personalInfo.bio').trim().notEmpty().withMessage('Bio is required'),
  body('services.category').notEmpty().withMessage('Service category is required'),
  body('services.primary').notEmpty().withMessage('Primary service is required'),
  body('professional.experience').isNumeric().withMessage('Experience must be a number'),
  body('professional.languages').isArray({ min: 1 }).withMessage('At least one language is required'),
  body('pricing.call.basePrice').isNumeric().withMessage('Call base price must be a number'),
  body('pricing.video.basePrice').isNumeric().withMessage('Video base price must be a number'),
  body('pricing.visit.basePrice').isNumeric().withMessage('Visit base price must be a number'),
  body('businessInfo.serviceAreas').isArray({ min: 1 }).withMessage('At least one service area is required')
];

// Routes - Only 5 essential endpoints
router.post('/', providerValidation, createProvider);        // Create provider
router.get('/', getAllProviders);                             // Get all with filters
router.get('/:id', getProviderById);                          // Get single provider
router.put('/:id', updateProvider);                           // Update provider
router.delete('/:id', deleteProvider);                        // Delete provider

export default router;
