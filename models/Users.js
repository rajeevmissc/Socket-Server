// ---- Imports ----
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ---- Schema ----
const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    index: true,
    trim: true
  },
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'provider', 'admin'],
    default: 'user'
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    avatar: String,
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true }
    }
  },
  preferences: {
    notifications: {
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    timezone: String,
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date
  },
  stats: {
    totalLogins: { type: Number, default: 0 },
    lastLogin: Date,
    lastLoginIP: String,
    accountCreatedIP: String
  },
  // Agora Video Call Token Fields
  rtcToken: {
    type: String,
    default: null,
    select: false // Don't include in default queries for security
  },
  rtmToken: {
    type: String,
    default: null,
    select: false // Don't include in default queries for security
  },
  rtcChannel: {
    type: String,
    default: null
  },
  rtcUid: {
    type: String,
    default: null
  },
  rtmUid: {
    type: String,
    default: null
  },
  lastTokenGenerated: {
    type: Date,
    default: null
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ---- Virtuals ----
userSchema.virtual('profile.fullName').get(function () {
  return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
});

// ---- Indexes ----
userSchema.index({ phoneNumber: 1, countryCode: 1 });
userSchema.index({ 'profile.email': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ rtcUid: 1 }); // Index for Agora UID lookups
userSchema.index({ tokenExpiresAt: 1 }); // Index for token expiration queries

// ---- Middleware ----
userSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// ---- Methods ----
userSchema.methods.incrementLoginStats = function (ip) {
  this.stats.totalLogins += 1;
  this.stats.lastLogin = new Date();
  this.stats.lastLoginIP = ip;
  return this.save();
};

userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.__v;
  delete user.security;
  // Also remove token data from public JSON for security
  delete user.rtcToken;
  delete user.rtmToken;
  delete user.rtcUid;
  delete user.rtmUid;
  return user;
};

// Check if user has valid Agora tokens
userSchema.methods.hasValidTokens = function () {
  return this.rtcToken && 
         this.rtmToken && 
         this.tokenExpiresAt && 
         new Date() < this.tokenExpiresAt;
};

// Get token info (without exposing actual tokens)
userSchema.methods.getTokenInfo = function () {
  return {
    hasTokens: !!(this.rtcToken && this.rtmToken),
    isExpired: this.tokenExpiresAt ? new Date() > this.tokenExpiresAt : true,
    channel: this.rtcChannel,
    uid: this.rtcUid,
    expiresAt: this.tokenExpiresAt,
    lastGenerated: this.lastTokenGenerated
  };
};

// ---- Static Methods ----
// Clean up expired tokens (run as cron job)
userSchema.statics.cleanExpiredTokens = async function () {
  const result = await this.updateMany(
    { tokenExpiresAt: { $lt: new Date() } },
    {
      $unset: {
        rtcToken: '',
        rtmToken: '',
        rtcChannel: '',
        rtcUid: '',
        rtmUid: '',
        tokenExpiresAt: ''
      },
      $set: {
        lastTokenGenerated: null
      }
    }
  );
  
  return {
    success: true,
    cleaned: result.modifiedCount,
    timestamp: new Date()
  };
};

// Find users with active call tokens
userSchema.statics.findUsersWithActiveTokens = async function () {
  return this.find({
    tokenExpiresAt: { $gt: new Date() },
    rtcToken: { $exists: true, $ne: null }
  }).select('phoneNumber profile.firstName profile.lastName rtcChannel rtcUid tokenExpiresAt');
};

// ---- Export ----
const User = mongoose.model('User', userSchema);
export default User;