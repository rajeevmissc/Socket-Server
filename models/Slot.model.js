// models/Slot.model.js
import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
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
  status: {
    type: String,
    enum: ['available', 'booked', 'blocked'],
    default: 'available'
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reservedUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound unique index
slotSchema.index({ providerId: 1, date: 1, timeSlot: 1 }, { unique: true });
slotSchema.index({ status: 1 });

export default mongoose.model('Slot', slotSchema);