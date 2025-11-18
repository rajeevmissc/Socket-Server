// import mongoose from 'mongoose';

// const qualificationSchema = new mongoose.Schema({
//   degree: { type: String, required: true },
//   institution: { type: String, required: true },
//   year: { type: String, required: true },
//   specialization: String
// }, { _id: false });

// const workingHoursSchema = new mongoose.Schema({
//   start: { type: String, required: true },
//   end: { type: String, required: true }
// }, { _id: false });

// const pricingOptionSchema = new mongoose.Schema({
//   basePrice: { type: Number, required: true },
//   duration: { type: Number, required: true },
//   currency: { type: String, default: 'INR' },
//   discounts: {
//     bulk: {
//       sessions: Number,
//       discount: Number
//     },
//     firstTime: Number
//   }
// }, { _id: false });

// const visitPricingSchema = new mongoose.Schema({
//   basePrice: { type: Number, required: true },
//   duration: { type: Number, required: true },
//   currency: { type: String, default: 'INR' },
//   travelRadius: Number,
//   extraCharges: mongoose.Schema.Types.Mixed
// }, { _id: false });

// const providerSchema = new mongoose.Schema({
//   personalInfo: {
//     firstName: { type: String, required: true, trim: true },
//     lastName: { type: String, required: true, trim: true },
//     fullName: { type: String, required: true },
//     role: {type: String, default: 'provider' },
//     email: { 
//       type: String, 
//       required: true, 
//       unique: true, 
//       lowercase: true,
//       trim: true,
//       match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
//     },
//     phone: { 
//       type: String, 
//       required: true,
//       match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please enter a valid phone number']
//     },
//     dateOfBirth: { type: Date, required: true },
//     gender: { 
//       type: String, 
//       required: true,
//       enum: ['Male', 'Female', 'Other']
//     },
//     profileImage: { type: String, default: null },
//     bio: { type: String, required: true, maxlength: 50000 }
//   },
  
//   address: {
//     street: { type: String, required: true },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     pincode: { type: String, required: true },
//     country: { type: String, default: 'India' },
//     coordinates: {
//       lat: { type: Number, default: 0 },
//       lng: { type: Number, default: 0 }
//     }
//   },
  
//   services: {
//     primary: { type: String, required: true },
//     secondary: [{ type: String }],
//     category: { type: String, required: true },
//     subcategories: [{ type: String }]
//   },
  
//   professional: {
//     experience: { type: Number, required: true, min: 0 },
//     verified: { type: Boolean, default: false },
//     verificationDate: { type: Date, default: null },
//     verificationDocuments: [{ type: String }],
//     languages: [{ type: String, required: true }],
//     specializations: [{ type: String }],
//     qualifications: [qualificationSchema]
//   },
  
//   ratings: {
//     overall: { type: Number, default: 0, min: 0, max: 5 },
//     totalReviews: { type: Number, default: 0 },
//     breakdown: {
//       5: { type: Number, default: 0 },
//       4: { type: Number, default: 0 },
//       3: { type: Number, default: 0 },
//       2: { type: Number, default: 0 },
//       1: { type: Number, default: 0 }
//     },
//     categories: mongoose.Schema.Types.Mixed
//   },
  
//   availability: {
//     status: { 
//       type: String, 
//       enum: ['available', 'busy', 'unavailable'], 
//       default: 'available' 
//     },
//     timezone: { type: String, default: 'Asia/Kolkata' },
//     workingHours: {
//       monday: { type: workingHoursSchema, required: true },
//       tuesday: { type: workingHoursSchema, required: true },
//       wednesday: { type: workingHoursSchema, required: true },
//       thursday: { type: workingHoursSchema, required: true },
//       friday: { type: workingHoursSchema, required: true },
//       saturday: { type: workingHoursSchema, required: true },
//       sunday: { type: workingHoursSchema, required: true }
//     },
//     bookedSlots: [{
//       date: String,
//       time: String,
//       mode: { type: String, enum: ['call', 'video', 'visit'] }
//     }]
//   },
  
//   pricing: {
//     call: { type: pricingOptionSchema, required: true },
//     video: { type: pricingOptionSchema, required: true },
//     visit: { type: visitPricingSchema, required: true },
//     chat: { type: pricingOptionSchema, required: true } 
//   },
  
//   portfolio: {
//     completedSessions: { type: Number, default: 0 },
//     successRate: { type: Number, default: 0, min: 0, max: 100 },
//     repeatCustomers: { type: Number, default: 0 },
//     achievements: [{ type: String }],
//     mediaFiles: [{
//       type: { type: String, enum: ['audio', 'video', 'image'] },
//       url: String,
//       title: String,
//       duration: String
//     }],
//     testimonials: [{
//       client: String,
//       rating: { type: Number, min: 1, max: 5 },
//       comment: String,
//       date: Date,
//       verified: { type: Boolean, default: false }
//     }]
//   },
  
//   businessInfo: {
//     joinDate: { type: Date, default: Date.now },
//     lastActive: { type: Date, default: Date.now },
//     responseTime: { type: String, default: 'Within 2 hours' },
//     cancellationPolicy: { type: String, required: true },
//     refundPolicy: { type: String, required: true },
//     equipment: [{ type: String }],
//     serviceAreas: [{ type: String, required: true }]
//   },

//   presence: {
//     isOnline: { type: Boolean, default: false },
//     availabilityStatus: {
//       type: String,
//       enum: ['online', 'offline', 'recently_active'],
//       default: 'offline'
//     },
//     lastSeen: { type: Date, default: null }
//   },
  
//   socialProof: {
//     badges: [{ type: String }],
//     platformStats: {
//       joinDate: String,
//       totalEarnings: { type: Number, default: 0 },
//       platformRating: { type: Number, default: 0, min: 0, max: 5 }
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes for better query performance
// providerSchema.index({ 'personalInfo.email': 1 });
// providerSchema.index({ 'services.category': 1 });
// providerSchema.index({ 'services.primary': 1 });
// providerSchema.index({ 'address.city': 1 });
// providerSchema.index({ 'ratings.overall': -1 });
// providerSchema.index({ 'availability.status': 1 });
// providerSchema.index({ 'presence.availabilityStatus': 1 });
// // Pre-save middleware to set fullName and other auto-generated fields
// providerSchema.pre('save', function(next) {
//   if (this.personalInfo.firstName && this.personalInfo.lastName) {
//     this.personalInfo.fullName = `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
//   }
  
//   // Set platform join date
//   if (!this.socialProof.platformStats.joinDate) {
//     const date = new Date();
//     this.socialProof.platformStats.joinDate = date.toLocaleDateString('en-US', { 
//       month: 'long', 
//       year: 'numeric' 
//     });
//   }
  
//   // Initialize badges
//   if (!this.socialProof.badges || this.socialProof.badges.length === 0) {
//     this.socialProof.badges = ['Verified Professional'];
//   }
  
//   next();
// });

// const Provider = mongoose.model('Provider', providerSchema);

// export default Provider;







import Provider from '../models/Provider.js';
import { validationResult } from 'express-validator';

// @desc    Create new provider
// @route   POST /api/providers
// @access  Public
export const createProvider = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Optimized existence check - only check email
    const existingProvider = await Provider.findOne({ 
      'personalInfo.email': req.body.personalInfo.email 
    }).select('_id').lean();

    if (existingProvider) {
      return res.status(400).json({ 
        success: false,
        message: 'Provider with this email already exists' 
      });
    }

    const provider = new Provider(req.body);
    await provider.save();

    // Return minimal data
    res.status(201).json({
      success: true,
      message: 'Provider registered successfully',
      data: {
        id: provider._id,
        name: provider.personalInfo.fullName,
        email: provider.personalInfo.email
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
      limit = 20, // Reduced from 100
      category,
      city,
      service,
      minRating,
      status = 'available',
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
        { 'services.primary': { $regex: service, $options: 'i' } },
        { 'services.secondary': { $regex: service, $options: 'i' } }
      ];
    }
    
    if (minRating) {
      query['ratings.overall'] = { $gte: parseFloat(minRating) };
    }

    if (status) {
      query['availability.status'] = status;
    }

    // Convert to numbers with bounds
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50

    // Select only essential fields for listing
    const selectFields = 'personalInfo.fullName personalInfo.email personalInfo.profileImage services category address.city ratings.overall availability.status presence.isOnline pricing.call.basePrice professional.experience';

    // Execute both queries in parallel
    const [providers, count] = await Promise.all([
      Provider.find(query)
        .select(selectFields)
        .sort(sortBy)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(), // Convert to plain JS objects (faster)
      
      Provider.countDocuments(query)
    ]);

    // Transform data to reduce response size
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
      isOnline: provider.presence?.isOnline
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
    // Select only necessary fields, exclude heavy fields
    const provider = await Provider.findById(req.params.id)
      .select('-__v -portfolio.mediaFiles -portfolio.testimonials -availability.bookedSlots -professional.verificationDocuments')
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
    const existingProvider = await Provider.findById(req.params.id).select('_id');
    
    if (!existingProvider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    // Update lastActive timestamp
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
        select: 'personalInfo.fullName personalInfo.email services category address.city ratings.overall availability.status presence.isOnline businessInfo.lastActive'
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

// @desc    Delete provider
// @route   DELETE /api/providers/:id
// @access  Private
export const deleteProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).select('_id');

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
      .select('portfolio professional.experience ratings testimonials')
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


