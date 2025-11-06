// models/wallet.model.js
import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  balance: { 
    type: Number, 
    default: 0, 
    min: 0,
    get: v => Math.round(v * 100) / 100, // Ensure 2 decimal places
    set: v => Math.round(v * 100) / 100
  },
  currency: { 
    type: String, 
    default: 'INR',
    uppercase: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  dailyLimit: { 
    type: Number, 
    default: 50000,
    min: 0
  },
  monthlyLimit: { 
    type: Number, 
    default: 200000,
    min: 0
  },
  dailySpent: { 
    type: Number, 
    default: 0,
    min: 0
  },
  monthlySpent: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lastResetDate: { 
    type: Date, 
    default: Date.now 
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String
  },
  blockedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for performance
walletSchema.index({ userId: 1 });
walletSchema.index({ isActive: 1 });
walletSchema.index({ createdAt: -1 });

// Virtual for available balance (considering any holds/blocks)
walletSchema.virtual('availableBalance').get(function() {
  return this.isActive && !this.isBlocked ? this.balance : 0;
});

// Instance method to check if wallet can spend amount
walletSchema.methods.canSpend = function(amount) {
  if (!this.isActive || this.isBlocked) return false;
  if (this.balance < amount) return false;
  if (this.dailySpent + amount > this.dailyLimit) return false;
  if (this.monthlySpent + amount > this.monthlyLimit) return false;
  return true;
};

// Instance method to get spending limits info
walletSchema.methods.getSpendingLimits = function() {
  return {
    dailyLimit: this.dailyLimit,
    monthlyLimit: this.monthlyLimit,
    dailySpent: this.dailySpent,
    monthlySpent: this.monthlySpent,
    dailyRemaining: Math.max(0, this.dailyLimit - this.dailySpent),
    monthlyRemaining: Math.max(0, this.monthlyLimit - this.monthlySpent)
  };
};

export const Wallet = mongoose.model('Wallet', walletSchema);