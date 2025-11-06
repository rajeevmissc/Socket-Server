// ---- Imports ----
import mongoose from 'mongoose';

// ---- Schema ----
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    platform: String,
    browser: String,
    os: String,
    device: String
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// ---- Indexes ----
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1, isActive: 1 });
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// ---- Methods ----
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

sessionSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// ---- Export ----
const Session = mongoose.model('Session', sessionSchema);
export default Session;
