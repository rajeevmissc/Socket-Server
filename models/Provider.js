import mongoose from 'mongoose';

const qualificationSchema = new mongoose.Schema({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  year: { type: String, required: true },
  specialization: String
}, { _id: false });

const workingHoursSchema = new mongoose.Schema({
  start: { type: String, required: true },
  end: { type: String, required: true }
}, { _id: false });

const pricingOptionSchema = new mongoose.Schema({
  basePrice: { type: Number, required: true },
  duration: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  discounts: {
    bulk: {
      sessions: Number,
      discount: Number
    },
    firstTime: Number
  }
}, { _id: false });

const visitPricingSchema = new mongoose.Schema({
  basePrice: { type: Number, required: true },
  duration: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  travelRadius: Number,
  extraCharges: mongoose.Schema.Types.Mixed
}, { _id: false });

const providerSchema = new mongoose.Schema({
  personalInfo: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, required: true },
    role: {type: String, required: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: { 
      type: String, 
      required: true,
      match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please enter a valid phone number']
    },
    dateOfBirth: { type: Date, required: true },
    gender: { 
      type: String, 
      required: true,
      enum: ['Male', 'Female', 'Other']
    },
    profileImage: { type: String, default: null },
    bio: { type: String, required: true, maxlength: 1000 }
  },
  
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    }
  },
  
  services: {
    primary: { type: String, required: true },
    secondary: [{ type: String }],
    category: { type: String, required: true },
    subcategories: [{ type: String }]
  },
  
  professional: {
    experience: { type: Number, required: true, min: 0 },
    verified: { type: Boolean, default: false },
    verificationDate: { type: Date, default: null },
    verificationDocuments: [{ type: String }],
    languages: [{ type: String, required: true }],
    specializations: [{ type: String }],
    qualifications: [qualificationSchema]
  },
  
  ratings: {
    overall: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    },
    categories: mongoose.Schema.Types.Mixed
  },
  
  availability: {
    status: { 
      type: String, 
      enum: ['available', 'busy', 'unavailable'], 
      default: 'available' 
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    workingHours: {
      monday: { type: workingHoursSchema, required: true },
      tuesday: { type: workingHoursSchema, required: true },
      wednesday: { type: workingHoursSchema, required: true },
      thursday: { type: workingHoursSchema, required: true },
      friday: { type: workingHoursSchema, required: true },
      saturday: { type: workingHoursSchema, required: true },
      sunday: { type: workingHoursSchema, required: true }
    },
    bookedSlots: [{
      date: String,
      time: String,
      mode: { type: String, enum: ['call', 'video', 'visit'] }
    }]
  },
  
  pricing: {
    call: { type: pricingOptionSchema, required: true },
    video: { type: pricingOptionSchema, required: true },
    visit: { type: visitPricingSchema, required: true }
  },
  
  portfolio: {
    completedSessions: { type: Number, default: 0 },
    successRate: { type: Number, default: 0, min: 0, max: 100 },
    repeatCustomers: { type: Number, default: 0 },
    achievements: [{ type: String }],
    mediaFiles: [{
      type: { type: String, enum: ['audio', 'video', 'image'] },
      url: String,
      title: String,
      duration: String
    }],
    testimonials: [{
      client: String,
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      date: Date,
      verified: { type: Boolean, default: false }
    }]
  },
  
  businessInfo: {
    joinDate: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    responseTime: { type: String, default: 'Within 2 hours' },
    cancellationPolicy: { type: String, required: true },
    refundPolicy: { type: String, required: true },
    equipment: [{ type: String }],
    serviceAreas: [{ type: String, required: true }]
  },

  presence: {
    isOnline: { type: Boolean, default: false },
    availabilityStatus: {
      type: String,
      enum: ['online', 'offline', 'recently_active'],
      default: 'offline'
    },
    lastSeen: { type: Date, default: null }
  },
  
  socialProof: {
    badges: [{ type: String }],
    platformStats: {
      joinDate: String,
      totalEarnings: { type: Number, default: 0 },
      platformRating: { type: Number, default: 0, min: 0, max: 5 }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
providerSchema.index({ 'personalInfo.email': 1 });
providerSchema.index({ 'services.category': 1 });
providerSchema.index({ 'services.primary': 1 });
providerSchema.index({ 'address.city': 1 });
providerSchema.index({ 'ratings.overall': -1 });
providerSchema.index({ 'availability.status': 1 });
providerSchema.index({ 'presence.availabilityStatus': 1 });
// Pre-save middleware to set fullName and other auto-generated fields
providerSchema.pre('save', function(next) {
  if (this.personalInfo.firstName && this.personalInfo.lastName) {
    this.personalInfo.fullName = `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
  }
  
  // Set platform join date
  if (!this.socialProof.platformStats.joinDate) {
    const date = new Date();
    this.socialProof.platformStats.joinDate = date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }
  
  // Initialize badges
  if (!this.socialProof.badges || this.socialProof.badges.length === 0) {
    this.socialProof.badges = ['Verified Professional'];
  }
  
  next();
});

const Provider = mongoose.model('Provider', providerSchema);

export default Provider;

