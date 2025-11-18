// import Provider from '../models/Provider.js';
// import { validationResult } from 'express-validator';

// // @desc    Create new provider
// // @route   POST /api/providers
// // @access  Public
// export const createProvider = async (req, res) => {
//   try {
//     // Check for validation errors
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ 
//         success: false,
//         errors: errors.array() 
//       });
//     }

//     // Check if provider with email already exists
//     const existingProvider = await Provider.findOne({ 
//       'personalInfo.email': req.body.personalInfo.email 
//     });

//     if (existingProvider) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Provider with this email already exists' 
//       });
//     }

//     // Create new provider
//     const provider = new Provider(req.body);
//     await provider.save();

//     res.status(201).json({
//       success: true,
//       message: 'Provider registered successfully',
//       data: provider
//     });

//   } catch (error) {
//     console.error('Error creating provider:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while creating provider',
//       error: error.message 
//     });
//   }
// };

// // @desc    Get all providers with filters and pagination
// // @route   GET /api/providers
// // @access  Public
// export const getAllProviders = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 100,
//       category,
//       city,
//       service,
//       minRating,
//       sortBy = '-ratings.overall'
//     } = req.query;

//     // Build query
//     const query = {};
    
//     if (category) {
//       query['services.category'] = category;
//     }
    
//     if (city) {
//       query['address.city'] = new RegExp(city, 'i');
//     }
    
//     if (service) {
//       query.$or = [
//         { 'services.primary': new RegExp(service, 'i') },
//         { 'services.secondary': new RegExp(service, 'i') }
//       ];
//     }
    
//     if (minRating) {
//       query['ratings.overall'] = { $gte: parseFloat(minRating) };
//     }

//     // Execute query with pagination
//     const providers = await Provider.find(query)
//       .sort(sortBy)
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .select('-__v');

//     // Get total count for pagination
//     const count = await Provider.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       count: providers.length,
//       total: count,
//       totalPages: Math.ceil(count / limit),
//       currentPage: parseInt(page),
//       data: providers
//     });

//   } catch (error) {
//     console.error('Error fetching providers:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching providers',
//       error: error.message 
//     });
//   }
// };

// // @desc    Get single provider by ID
// // @route   GET /api/providers/:id
// // @access  Public
// export const getProviderById = async (req, res) => {
//   try {
//     const provider = await Provider.findById(req.params.id).select('-__v');

//     if (!provider) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'Provider not found' 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: provider
//     });

//   } catch (error) {
//     console.error('Error fetching provider:', error);
    
//     if (error.kind === 'ObjectId') {
//       return res.status(404).json({ 
//         success: false,
//         message: 'Provider not found' 
//       });
//     }
    
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching provider',
//       error: error.message 
//     });
//   }
// };

// // @desc    Update provider
// // @route   PUT /api/providers/:id
// // @access  Private
// export const updateProvider = async (req, res) => {
//   try {
//     const provider = await Provider.findById(req.params.id);

//     if (!provider) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'Provider not found' 
//       });
//     }

//     // Update lastActive timestamp
//     if (req.body.businessInfo) {
//       req.body.businessInfo.lastActive = new Date();
//     } else {
//       req.body.businessInfo = {
//         ...provider.businessInfo.toObject(),
//         lastActive: new Date()
//       };
//     }

//     const updatedProvider = await Provider.findByIdAndUpdate(
//       req.params.id,
//       { $set: req.body },
//       { new: true, runValidators: true }
//     );

//     res.status(200).json({
//       success: true,
//       message: 'Provider updated successfully',
//       data: updatedProvider
//     });

//   } catch (error) {
//     console.error('Error updating provider:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while updating provider',
//       error: error.message 
//     });
//   }
// };

// // @desc    Delete provider
// // @route   DELETE /api/providers/:id
// // @access  Private
// export const deleteProvider = async (req, res) => {
//   try {
//     const provider = await Provider.findById(req.params.id);

//     if (!provider) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'Provider not found' 
//       });
//     }

//     await provider.deleteOne();

//     res.status(200).json({
//       success: true,
//       message: 'Provider deleted successfully',
//       data: {}
//     });

//   } catch (error) {
//     console.error('Error deleting provider:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while deleting provider',
//       error: error.message 
//     });
//   }
// };
















import Provider from '../models/Provider.js';
import { validationResult } from 'express-validator';

// @desc    Create new provider - OPTIMIZED
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

    // Optimized existence check - only check email with minimal fields
    const existingProvider = await Provider.findOne({ 
      'personalInfo.email': req.body.personalInfo.email 
    }).select('_id').lean();

    if (existingProvider) {
      return res.status(400).json({ 
        success: false,
        message: 'Provider with this email already exists' 
      });
    }

    // Create new provider
    const provider = new Provider(req.body);
    await provider.save();

    // Return only essential data to reduce response size
    res.status(201).json({
      success: true,
      message: 'Provider registered successfully',
      data: {
        id: provider._id,
        name: provider.personalInfo.fullName,
        email: provider.personalInfo.email,
        category: provider.services.category
      }
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

// @desc    Get all providers with filters and pagination - OPTIMIZED
// @route   GET /api/providers
// @access  Public
export const getAllProviders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20, // Reduced from 100 to 20
      category,
      city,
      service,
      minRating,
      status,
      sortBy = '-ratings.overall'
    } = req.query;

    // Build optimized query
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

    if (status) {
      query['availability.status'] = status;
    }

    // Convert to numbers with bounds for safety
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50

    // Select only essential fields for listing
    const selectFields = 'personalInfo.fullName personalInfo.email personalInfo.profileImage services address.city ratings.overall availability.status presence.isOnline pricing.call.basePrice professional.experience professional.verified';

    // Execute both queries in parallel for better performance
    const [providers, count] = await Promise.all([
      Provider.find(query)
        .select(selectFields)
        .sort(sortBy)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(), // Convert to plain JS objects (faster)
      
      Provider.countDocuments(query)
    ]);

    // Transform data to reduce response size significantly
    const transformedProviders = providers.map(provider => ({
      id: provider._id,
      name: provider.personalInfo?.fullName,
      email: provider.personalInfo?.email,
      profileImage: provider.personalInfo?.profileImage,
      category: provider.services?.category,
      primaryService: provider.services?.primary,
      city: provider.address?.city,
      rating: provider.ratings?.overall,
      experience: provider.professional?.experience,
      price: provider.pricing?.call?.basePrice,
      status: provider.availability?.status,
      isOnline: provider.presence?.isOnline,
      verified: provider.professional?.verified
    }));

    res.status(200).json({
      success: true,
      count: transformedProviders.length,
      total: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      data: transformedProviders
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

// @desc    Get single provider by ID - OPTIMIZED
// @route   GET /api/providers/:id
// @access  Public
export const getProviderById = async (req, res) => {
  try {
    // Select only necessary fields, exclude heavy/unnecessary fields
    const provider = await Provider.findById(req.params.id)
      .select('-__v -portfolio.mediaFiles -portfolio.testimonials -availability.bookedSlots -professional.verificationDocuments -socialProof')
      .lean();

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

// @desc    Update provider - OPTIMIZED
// @route   PUT /api/providers/:id
// @access  Private
export const updateProvider = async (req, res) => {
  try {
    // First check if provider exists with minimal query
    const existingProvider = await Provider.findById(req.params.id).select('_id').lean();
    
    if (!existingProvider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    // Update lastActive and lastSeen timestamps
    const updateData = {
      ...req.body,
      'businessInfo.lastActive': new Date(),
      'presence.lastSeen': new Date()
    };

    const updatedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        // Select only essential fields to return
        select: 'personalInfo.fullName personalInfo.email services address.city ratings.overall availability.status presence.isOnline businessInfo.lastActive professional.verified'
      }
    ).lean();

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

// @desc    Delete provider - OPTIMIZED
// @route   DELETE /api/providers/:id
// @access  Private
export const deleteProvider = async (req, res) => {
  try {
    // Check existence with minimal query
    const provider = await Provider.findById(req.params.id).select('_id').lean();

    if (!provider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    await Provider.findByIdAndDelete(req.params.id);

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

// @desc    Get provider portfolio (separate endpoint for heavy data)
// @route   GET /api/providers/:id/portfolio
// @access  Public
export const getProviderPortfolio = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .select('portfolio professional.experience ratings.overall ratings.totalReviews professional.qualifications')
      .lean();

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
    console.error('Error fetching provider portfolio:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching portfolio',
      error: error.message 
    });
  }
};

// @desc    Search providers with advanced filters - OPTIMIZED
// @route   GET /api/providers/search
// @access  Public
export const searchProviders = async (req, res) => {
  try {
    const {
      q, // search query
      page = 1,
      limit = 20,
      city,
      category,
      minExperience = 0,
      maxPrice,
      verified = true
    } = req.query;

    // Build search query
    const query = {};

    if (q) {
      query.$or = [
        { 'personalInfo.fullName': new RegExp(q, 'i') },
        { 'services.primary': new RegExp(q, 'i') },
        { 'services.secondary': new RegExp(q, 'i') },
        { 'professional.specializations': new RegExp(q, 'i') }
      ];
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (category) {
      query['services.category'] = category;
    }

    if (minExperience) {
      query['professional.experience'] = { $gte: parseInt(minExperience) };
    }

    if (maxPrice) {
      query['pricing.call.basePrice'] = { $lte: parseFloat(maxPrice) };
    }

    if (verified === 'true') {
      query['professional.verified'] = true;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const selectFields = 'personalInfo.fullName personalInfo.profileImage services address.city ratings.overall professional.experience professional.verified pricing.call.basePrice availability.status presence.isOnline';

    const [providers, count] = await Promise.all([
      Provider.find(query)
        .select(selectFields)
        .sort('-ratings.overall -professional.experience')
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
      
      Provider.countDocuments(query)
    ]);

    const transformedProviders = providers.map(provider => ({
      id: provider._id,
      name: provider.personalInfo?.fullName,
      profileImage: provider.personalInfo?.profileImage,
      category: provider.services?.category,
      primaryService: provider.services?.primary,
      city: provider.address?.city,
      rating: provider.ratings?.overall,
      experience: provider.professional?.experience,
      price: provider.pricing?.call?.basePrice,
      status: provider.availability?.status,
      isOnline: provider.presence?.isOnline,
      verified: provider.professional?.verified
    }));

    res.status(200).json({
      success: true,
      count: transformedProviders.length,
      total: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      data: transformedProviders
    });

  } catch (error) {
    console.error('Error searching providers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while searching providers',
      error: error.message 
    });
  }
};

// @desc    Get providers by category - OPTIMIZED
// @route   GET /api/providers/category/:category
// @access  Public
export const getProvidersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20, city } = req.query;

    const query = { 
      'services.category': category 
    };

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const selectFields = 'personalInfo.fullName personalInfo.profileImage services address.city ratings.overall professional.experience pricing.call.basePrice availability.status';

    const [providers, count] = await Promise.all([
      Provider.find(query)
        .select(selectFields)
        .sort('-ratings.overall')
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
      
      Provider.countDocuments(query)
    ]);

    const transformedProviders = providers.map(provider => ({
      id: provider._id,
      name: provider.personalInfo?.fullName,
      profileImage: provider.personalInfo?.profileImage,
      primaryService: provider.services?.primary,
      city: provider.address?.city,
      rating: provider.ratings?.overall,
      experience: provider.professional?.experience,
      price: provider.pricing?.call?.basePrice,
      status: provider.availability?.status
    }));

    res.status(200).json({
      success: true,
      category,
      count: transformedProviders.length,
      total: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      data: transformedProviders
    });

  } catch (error) {
    console.error('Error fetching providers by category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching providers by category',
      error: error.message 
    });
  }
};
