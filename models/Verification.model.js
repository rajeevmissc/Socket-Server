import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  verificationId: {
    type: String,
    required: true,
    unique: true,
    default: () => `VER-${Date.now()}`
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
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
  
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  aadhaarNumber: {
    type: String,
    required: true,
    match: [/^\d{12}$/, 'Aadhaar number must be 12 digits']
  },
  
  // Address Information
  addressType: {
    type: String,
    enum: ['home', 'public'],
    default: 'home'
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true,
    match: [/^\d{6}$/, 'Pincode must be 6 digits']
  },
  
  // Government ID
  governmentIdType: {
    type: String,
    enum: ['aadhaar', 'driving_license', 'voter_id', 'passport'],
    required: true
  },
  governmentIdNumber: {
    type: String,
    required: true
  },
  
  // File Uploads
  idProofFile: {
    filename: String,
    originalName: String,
    mimetype: String,
    path: String,
    size: Number
  },
  addressProofFile: {
    filename: String,
    originalName: String,
    mimetype: String,
    path: String,
    size: Number
  },
  
  // Verification Status
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'under_review'],
    default: 'pending'
  },
  verificationNotes: String,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date
}, {
  timestamps: true
});

// Indexes
verificationSchema.index({ userId: 1, bookingId: 1 });
verificationSchema.index({ status: 1 });
verificationSchema.index({ aadhaarNumber: 1 });

export default mongoose.model('Verification', verificationSchema);