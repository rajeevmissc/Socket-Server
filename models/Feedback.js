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
  serviceCategory: {
    type: String,
    required: [true, 'Service category is required'],
    enum: [
      'Communication & Emotional Support',
      'Arts, Music & Creative Expression',
      'Reading & Knowledge Sharing',
      'Sports & Physical Activities',
      'Games & Entertainment',
      'Education & Skill Development',
      'Lifestyle & Practical Help',
      'Social & Cultural Engagement',
      'Emotional Well-being & Mindfulness'
    ]
  },
  specificService: {
    type: String,
    required: [true, 'Specific service is required']
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
  categoryRatings: {
    quality: {
      type: Number,
      required: [true, 'Quality rating is required'],
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      required: [true, 'Punctuality rating is required'],
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      required: [true, 'Communication rating is required'],
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      required: [true, 'Professionalism rating is required'],
      min: 1,
      max: 5
    }
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

// Virtual for average category rating
feedbackSchema.virtual('averageCategoryRating').get(function() {
  const { quality, punctuality, communication, professionalism } = this.categoryRatings;
  return ((quality + punctuality + communication + professionalism) / 4).toFixed(1);
});

// Method to check if feedback is positive
feedbackSchema.methods.isPositive = function() {
  return this.overallRating >= 4;
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;

