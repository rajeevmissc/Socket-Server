import Provider from '../models/Provider.js';
import { validationResult } from 'express-validator';

// @desc    Create new provider
// @route   POST /api/providers
// @access  Public
export const createProvider = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Check if provider with email already exists
    const existingProvider = await Provider.findOne({ 
      'personalInfo.email': req.body.personalInfo.email 
    });

    if (existingProvider) {
      return res.status(400).json({ 
        success: false,
        message: 'Provider with this email already exists' 
      });
    }

    // Create new provider
    const provider = new Provider(req.body);
    await provider.save();

    res.status(201).json({
      success: true,
      message: 'Provider registered successfully',
      data: provider
    });

  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating provider',
      error: error.message 
    });
  }
};

// @desc    Get all providers with filters and pagination
// @route   GET /api/providers
// @access  Public
export const getAllProviders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      city,
      service,
      minRating,
      sortBy = '-ratings.overall'
    } = req.query;

    // Build query
    const query = {};
    
    if (category) {
      query['services.category'] = category;
    }
    
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    
    if (service) {
      query.$or = [
        { 'services.primary': new RegExp(service, 'i') },
        { 'services.secondary': new RegExp(service, 'i') }
      ];
    }
    
    if (minRating) {
      query['ratings.overall'] = { $gte: parseFloat(minRating) };
    }

    // Execute query with pagination
    const providers = await Provider.find(query)
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const count = await Provider.countDocuments(query);

    res.status(200).json({
      success: true,
      count: providers.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: providers
    });

  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching providers',
      error: error.message 
    });
  }
};

// @desc    Get single provider by ID
// @route   GET /api/providers/:id
// @access  Public
export const getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).select('-__v');

    if (!provider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: provider
    });

  } catch (error) {
    console.error('Error fetching provider:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching provider',
      error: error.message 
    });
  }
};

// @desc    Update provider
// @route   PUT /api/providers/:id
// @access  Private
export const updateProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    // Update lastActive timestamp
    if (req.body.businessInfo) {
      req.body.businessInfo.lastActive = new Date();
    } else {
      req.body.businessInfo = {
        ...provider.businessInfo.toObject(),
        lastActive: new Date()
      };
    }

    const updatedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Provider updated successfully',
      data: updatedProvider
    });

  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating provider',
      error: error.message 
    });
  }
};

// @desc    Delete provider
// @route   DELETE /api/providers/:id
// @access  Private
export const deleteProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    await provider.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Provider deleted successfully',
      data: {}
    });

  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting provider',
      error: error.message 
    });
  }
};
