// models/payment.model.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  paymentId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  orderId: { 
    type: String, 
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
  currency: { 
    type: String, 
    default: 'INR',
    uppercase: true
  },
  status: { 
    type: String, 
    enum: ['created', 'authorized', 'captured', 'refunded', 'failed', 'cancelled'], 
    default: 'created',
    index: true
  },
  // paymentMethod: { 
  //   type: String, 
  //   required: true,
  //   enum: ['UPI', 'Credit Card', 'Debit Card', 'amazon_pay', 'Net Banking', 'Wallet', 'Cash', 'Stripe', 'Stripe Checkout','Credit/Debit Card',]
  // },
  // paymentGateway: {
  //   type: String,
  //   enum: ['Razorpay', 'Stripe', 'PayPal', 'Manual'],
  //   default: 'Stripe'
  // },


  paymentMethod: { 
  type: String, 
  required: true,
  enum: [
    'UPI',
    'Credit Card',
    'Debit Card',
    'Net Banking',
    'Wallet',
    'Cash',
    'Stripe',
    'Stripe Checkout',
    'Credit/Debit Card',

    // ⭐ Added for Cashfree integration
    'Cashfree',
    'Cashfree Checkout'
  ]
},

paymentGateway: {
  type: String,
  enum: ['Razorpay', 'Stripe', 'PayPal', 'Manual', 'Cashfree'], // ⭐ Add Cashfree
  default: 'Cashfree'
},

  
  // Gateway-specific data
  gatewayResponse: { 
    type: mongoose.Schema.Types.Mixed 
  },
  signature: { 
    type: String 
  },
  receipt: {
    type: String
  },
  
  // Payment details
  description: {
    type: String,
    default: 'Wallet Recharge'
  },
  notes: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Customer information
  customerInfo: {
    name: String,
    email: String,
    phone: String
  },
  
  // Billing details
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  
  // Refund information
  refundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    },
    processedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tracking information
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    type: String,
    platform: String,
    browser: String
  },
  
  // Processing timestamps
  authorizedAt: Date,
  capturedAt: Date,
  failedAt: Date,
  cancelledAt: Date,
  
  // Failure information
  failureCode: String,
  failureReason: String,
  failureDescription: String,
  
  // Internal tracking
  attempts: {
    type: Number,
    default: 1,
    min: 1
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now
  },
  
  // Linked transaction
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ paymentGateway: 1, createdAt: -1 });
paymentSchema.index({ 'gatewayResponse.payment_intent': 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
});

// Virtual for payment age
paymentSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for refundable amount
paymentSchema.virtual('refundableAmount').get(function() {
  return Math.max(0, this.amount - this.refundedAmount);
});

// Instance method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return ['authorized', 'captured'].includes(this.status);
};

// Instance method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  if (!this.isSuccessful()) return false;
  if (this.refundedAmount >= this.amount) return false;
  
  // Check refund window (e.g., 180 days for payments)
  const refundWindow = 180 * 24 * 60 * 60 * 1000; // 180 days
  const isWithinWindow = (Date.now() - this.createdAt.getTime()) <= refundWindow;
  
  return isWithinWindow;
};

// Instance method to add refund record
paymentSchema.methods.addRefund = function(refundData) {
  this.refunds.push({
    refundId: refundData.refundId,
    amount: refundData.amount,
    reason: refundData.reason || 'Customer request',
    status: refundData.status || 'pending',
    processedAt: refundData.processedAt
  });
  
  this.refundedAmount += refundData.amount;
  
  // Update payment status if fully refunded
  if (this.refundedAmount >= this.amount) {
    this.status = 'refunded';
  }
  
  return this.save();
};

// Instance method to get payment summary
paymentSchema.methods.getSummary = function() {
  return {
    paymentId: this.paymentId,
    orderId: this.orderId,
    amount: this.amount,
    formattedAmount: this.formattedAmount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    paymentGateway: this.paymentGateway,
    createdAt: this.createdAt,
    isSuccessful: this.isSuccessful(),
    canRefund: this.canRefund(),
    refundableAmount: this.refundableAmount
  };
};

// Static method to get payment statistics
paymentSchema.statics.getStats = async function(filters = {}) {
  const matchConditions = {};
  
  if (filters.userId) matchConditions.userId = filters.userId;
  if (filters.status) matchConditions.status = filters.status;
  if (filters.paymentMethod) matchConditions.paymentMethod = filters.paymentMethod;
  if (filters.startDate && filters.endDate) {
    matchConditions.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  const methodStats = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  return {
    statusWise: stats.map(s => ({
      status: s._id,
      count: s.count,
      totalAmount: Math.round(s.totalAmount * 100) / 100,
      avgAmount: Math.round(s.avgAmount * 100) / 100
    })),
    methodWise: methodStats.map(m => ({
      method: m._id,
      count: m.count,
      totalAmount: Math.round(m.totalAmount * 100) / 100
    }))
  };
};

// Pre-save middleware to update status timestamps
paymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'authorized':
        if (!this.authorizedAt) this.authorizedAt = now;
        break;
      case 'captured':
        if (!this.capturedAt) this.capturedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }
  next();
});

// Post-save middleware for logging
paymentSchema.post('save', function(doc) {
  console.log(`Payment ${doc.paymentId} status updated to: ${doc.status}`);
});


export const Payment = mongoose.model('Payment', paymentSchema);
