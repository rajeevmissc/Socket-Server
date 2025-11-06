import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    userPhone: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5'
      }
    },
    service: {
      type: String,
      required: true,
      enum: [
        'Event Companion',
        'Childcare',
        'Culinary Service',
        'Elder Care',
        'Education Support',
        'Transportation',
        'Fitness Coaching',
        'Event Planning',
        'Home Organization',
        'Other'
      ]
    },
    testimonialText: {
      type: String,
      required: true,
      minlength: [50, 'Testimonial must be at least 50 characters long'],
      maxlength: [500, 'Testimonial cannot exceed 500 characters'],
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
testimonialSchema.index({ status: 1, createdAt: -1 });
testimonialSchema.index({ service: 1, status: 1 });

// Static method to get approved testimonials
testimonialSchema.statics.getApprovedTestimonials = function(filters = {}) {
  return this.find({ 
    status: 'approved', 
    isPublished: true,
    ...filters 
  }).sort({ createdAt: -1 });
};

// Instance method to approve testimonial
testimonialSchema.methods.approve = function(reviewerId) {
  this.status = 'approved';
  this.isPublished = true;
  this.publishedAt = new Date();
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  return this.save();
};

// Instance method to reject testimonial
testimonialSchema.methods.reject = function(reviewerId, reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  return this.save();
};

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;
