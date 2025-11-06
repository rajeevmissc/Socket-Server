// ---- Imports ----
import mongoose from 'mongoose';

// ---- Schema ----
const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    index: true,
    trim: true
  },
  otp: {
    type: String,
    required: [true, 'OTP is required']
  },
  purpose: {
    type: String,
    enum: ['login', 'registration', 'password_reset', 'phone_verification', '2fa'],
    default: 'login'
  },
  attempts: {
    type: Number,
    default: 0,
    max: [5, 'Maximum OTP attempts exceeded']
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  ipAddress: String,
  userAgent: String,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// ---- Indexes ----
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
otpSchema.index({ phoneNumber: 1, isUsed: 1, expiresAt: 1 });

// ---- Methods ----
otpSchema.methods.incrementAttempt = function() {
  this.attempts += 1;
  return this.save();
};

otpSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  return this.save();
};

// ---- Export ----
const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
