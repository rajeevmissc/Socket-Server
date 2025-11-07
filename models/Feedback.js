import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  providerId: {
    type: String,
    default: ''
  },
  providerName: {
    type: String,
    default: ''
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  sessionDate: {
    type: Date,
    default: null
  },
  overallRating: {
    type: Number,
    required: [true, 'Overall rating is required'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    minlength: [20, 'Comment must be at least 20 characters long'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  wouldRecommend: {
    type: Boolean,
    required: [true, 'Recommendation is required']
  },
  verified: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
feedbackSchema.index({ providerId: 1 });
feedbackSchema.index({ serviceCategory: 1 });
feedbackSchema.index({ overallRating: 1 });
feedbackSchema.index({ submittedAt: -1 });


const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;

