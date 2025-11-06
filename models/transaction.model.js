// models/transaction.model.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  walletId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Wallet', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['credit', 'debit'], 
    required: true,
    index: true
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0.01,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 255
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'], 
    default: 'pending',
    index: true
  },
  reference: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    index: true
  },
  
  // Service-related fields
  serviceId: { 
    type: String,
    index: true
  },
  serviceType: { 
    type: String, 
    enum: ['call', 'video', 'visit', 'subscription', 'other'] 
  },
  providerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Payment-related fields - UPDATED ENUM
  paymentMethod: { 
    type: String,
    enum: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet', 'Cash', 'Stripe', 'Stripe Checkout']
  },
  paymentGateway: { 
    type: String,
    enum: ['Razorpay', 'Stripe', 'PayPal', 'Manual']
  },
  paymentId: { 
    type: String 
  },
  gatewayTransactionId: { 
    type: String 
  },
  
  // Balance tracking
  balanceBefore: { 
    type: Number, 
    required: true,
    get: v => Math.round(v * 100) / 100
  },
  balanceAfter: { 
    type: Number, 
    required: true,
    get: v => Math.round(v * 100) / 100
  },
  
  // Additional transaction details
  category: {
    type: String,
    enum: ['recharge', 'service_payment', 'refund', 'cashback', 'bonus', 'penalty', 'transfer', 'other'],
    default: 'other'
  },
  
  // Metadata and tracking
  metadata: { 
    type: mongoose.Schema.Types.Mixed 
  },
  ipAddress: { 
    type: String 
  },
  userAgent: { 
    type: String 
  },
  location: {
    country: String,
    state: String,
    city: String
  },
  
  // Refund tracking
  parentTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundedAt: {
    type: Date
  },
  
  // Approval workflow
  needsApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Processing timestamps
  processedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Compound indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ serviceId: 1, createdAt: -1 });
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ gatewayTransactionId: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
});

// Virtual for transaction age
transactionSchema.virtual('age').get(function() {
  return this.createdAt ? (Date.now() - this.createdAt.getTime()) : 0;
});


// Instance method to check if transaction can be refunded
transactionSchema.methods.canRefund = function() {
  if (this.type !== 'debit') return false;
  if (this.status !== 'completed') return false;
  if (this.refundedAmount >= this.amount) return false;

  const refundWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
  const createdAt = this.createdAt || new Date();
  const isWithinWindow = (Date.now() - createdAt.getTime()) <= refundWindow;

  return isWithinWindow;
};


// Instance method to calculate refundable amount
transactionSchema.methods.getRefundableAmount = function() {
  if (!this.canRefund()) return 0;
  return this.amount - this.refundedAmount;
};

// Static method to get transaction stats for a user
transactionSchema.statics.getUserStats = async function(userId, startDate, endDate) {
  const matchConditions = { userId };
  
  if (startDate && endDate) {
    matchConditions.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  const result = {
    credit: { totalAmount: 0, count: 0, avgAmount: 0 },
    debit: { totalAmount: 0, count: 0, avgAmount: 0 }
  };
  
  stats.forEach(stat => {
    result[stat._id] = {
      totalAmount: Math.round(stat.totalAmount * 100) / 100,
      count: stat.count,
      avgAmount: Math.round(stat.avgAmount * 100) / 100
    };
  });
  
  return result;
};

// Pre-save middleware to set processed timestamp
transactionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed') {
      this.processedAt = new Date();
    } else if (this.status === 'failed') {
      this.failedAt = new Date();
    }
  }
  next();
});

export const Transaction = mongoose.model('Transaction', transactionSchema);