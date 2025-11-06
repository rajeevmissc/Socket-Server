import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: String,
  filename: String,
  uploadDate: { type: Date, default: Date.now },
  duration: Number, // Duration in seconds
  mimeType: String
});

const HostSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  gender: String,
  phone: String,
  dob: String, // Store as string in dd/mm/yyyy format
  password: String,
  bio: String,
  rtmToken: String,
  rtcToken: String,
  profilePhoto: {
    type: mediaSchema,
    default: null
  },
  additionalPhotos: [mediaSchema],
  auditionVideo: {
    type: mediaSchema,
    default: null
  },
  aadharCard: {
    front: { type: mediaSchema, default: null },
    back: { type: mediaSchema, default: null },
    verified: { type: Boolean, default: false },
    number: { type: String, default: '' }
  },
  knownLanguages: [{ type: String }]
}, { timestamps: true });

// Index for faster querying
HostSchema.index({ email: 1 });

export default mongoose.model('Host', HostSchema);
