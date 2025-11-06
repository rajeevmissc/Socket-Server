// models/Booking.model.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    default: () => `BOOK-${Date.now()}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  providerName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['call', 'video', 'visit'],
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'verification_pending'],
    default: 'verification_pending' // ✅ Changed default status
  },
  walletTransactionId: {
    type: String
  },
   verificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Verification' // ✅ Added verification reference
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, date: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ date: 1, timeSlot: 1 });

export default mongoose.model('Booking', bookingSchema);