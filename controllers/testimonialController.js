import Testimonial from '../models/Testimonial.js';
import { validationResult } from 'express-validator';

// @desc    Create new testimonial
// @route   POST /api/testimonials
// @access  Private (authenticated users only)
export const createTestimonial = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      rating,
      service,
      testimonialText,
      location
    } = req.body;

    // Check if user already submitted a testimonial for this service
    const existingTestimonial = await Testimonial.findOne({
      userId: req.user.id,
      service: service,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingTestimonial) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a testimonial for this service'
      });
    }

    // Create testimonial
    const testimonial = await Testimonial.create({
      userId: req.user.id,
      userName: req.user.profile?.fullName || 'User',
      userPhone: req.user.phoneNumber,
      rating,
      service,
      testimonialText,
      location,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial submitted successfully. It will be reviewed before publishing.',
      data: {
        id: testimonial._id,
        status: testimonial.status
      }
    });

  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit testimonial',
      error: error.message
    });
  }
};

// @desc    Get all approved testimonials (public)
// @route   GET /api/testimonials
// @access  Public
export const getTestimonials = async (req, res) => {
  try {
    const { service, rating } = req.query;

    const filters = {};
    if (service) filters.service = service;
    if (rating) filters.rating = parseInt(rating);

    const testimonials = await Testimonial.find({
      status: 'approved',
      isPublished: true,
      ...filters
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: testimonials
    });

  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials',
      error: error.message
    });
  }
};

// @desc    Get user's own testimonials
// @route   GET /api/testimonials/my-testimonials
// @access  Private
export const getMyTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: testimonials
    });

  } catch (error) {
    console.error('Error fetching user testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials',
      error: error.message
    });
  }
};

// @desc    Get single testimonial by ID
// @route   GET /api/testimonials/:id
// @access  Public
export const getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Only show approved testimonials to public
    if (testimonial.status !== 'approved' && 
        (!req.user || testimonial.userId.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: testimonial
    });

  } catch (error) {
    console.error('Error fetching testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonial',
      error: error.message
    });
  }
};

// @desc    Update testimonial (only if pending)
// @route   PUT /api/testimonials/:id
// @access  Private
export const updateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Check ownership
    if (testimonial.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this testimonial'
      });
    }

    // Only allow updates if status is pending
    if (testimonial.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update testimonial after review'
      });
    }

    const { rating, service, testimonialText, location } = req.body;

    testimonial.rating = rating || testimonial.rating;
    testimonial.service = service || testimonial.service;
    testimonial.testimonialText = testimonialText || testimonial.testimonialText;
    testimonial.location = location || testimonial.location;

    await testimonial.save();

    res.status(200).json({
      success: true,
      message: 'Testimonial updated successfully',
      data: testimonial
    });

  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update testimonial',
      error: error.message
    });
  }
};

// @desc    Delete testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private
export const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Check ownership
    if (testimonial.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this testimonial'
      });
    }

    await testimonial.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete testimonial',
      error: error.message
    });
  }
};



// ============================================
// ADMIN CONTROLLERS
// ============================================

// @desc    Get all testimonials (for admin review)
// @route   GET /api/testimonials/admin/all
// @access  Private/Admin
export const getAllTestimonialsAdmin = async (req, res) => {
  try {
    const { status, service } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (service) filters.service = service;

    const testimonials = await Testimonial.find(filters)
      .populate('userId', 'profile.fullName phoneNumber email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: testimonials
    });

  } catch (error) {
    console.error('Error fetching admin testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials',
      error: error.message
    });
  }
};

// @desc    Approve testimonial
// @route   PATCH /api/testimonials/admin/:id/approve
// @access  Private/Admin
export const approveTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    await testimonial.approve(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Testimonial approved and published',
      data: testimonial
    });

  } catch (error) {
    console.error('Error approving testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve testimonial',
      error: error.message
    });
  }
};

// @desc    Reject testimonial
// @route   PATCH /api/testimonials/admin/:id/reject
// @access  Private/Admin
export const rejectTestimonial = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    await testimonial.reject(req.user.id, reason);

    res.status(200).json({
      success: true,
      message: 'Testimonial rejected',
      data: testimonial
    });

  } catch (error) {
    console.error('Error rejecting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject testimonial',
      error: error.message
    });
  }
};