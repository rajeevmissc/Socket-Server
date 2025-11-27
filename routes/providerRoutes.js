import express from 'express';
import { body } from 'express-validator';
import {
  createProvider,
  getAllProviders,
  getProviderById,
  updateProvider,
  deleteProvider,
  getAllProvidersPersonalInfo
} from '../controllers/providerController.js';
import Provider from '../models/Provider.js';
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



// Add this to your existing providerRoutes.js

// Get presence status for all providers
router.get('/presence', async (req, res) => {
  try {
    const providers = await Provider.find(
      {}, 
      { 
        _id: 1, 
        'presence.isOnline': 1, 
        'presence.availabilityStatus': 1 
      }
    );

    const presenceMap = {};
    providers.forEach(provider => {
      presenceMap[provider._id.toString()] = {
        isOnline: provider.presence?.isOnline || false,
        status: provider.presence?.availabilityStatus || 'offline'
      };
    });

    res.json({ success: true, presence: presenceMap });
  } catch (error) {
    console.error('Error fetching presence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update provider status
router.post('/update-status', async (req, res) => {
  try {
    const { providerId, status } = req.body;

    if (!providerId || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'ProviderId and status are required' 
      });
    }

    const isOnline = status === 'online';

    await Provider.findByIdAndUpdate(providerId, {
      'presence.isOnline': isOnline,
      'presence.availabilityStatus': status,
      'presence.lastSeen': new Date()
    });

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes - Only 5 essential endpoints
router.post('/', providerValidation, createProvider);        // Create provider
router.get('/', getAllProviders);                             // Get all with filters
router.get('/personal-info', getAllProvidersPersonalInfo);
router.get('/:id', getProviderById);                          // Get single provider
router.put('/:id', updateProvider);                           // Update provider
router.delete('/:id', deleteProvider);                        // Delete provider

export default router;




