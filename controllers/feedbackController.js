import Feedback from '../models/Feedback.js';

// @desc    Create new feedback
// @route   POST /api/feedback
// @access  Public
export const createFeedback = async (req, res) => {
  try {
    const feedbackData = req.body;

    // Validate required fields
    if (!feedbackData.clientName || !feedbackData.serviceCategory || 
        !feedbackData.specificService || !feedbackData.overallRating || 
        !feedbackData.comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate ratings
    if (feedbackData.overallRating < 1 || feedbackData.overallRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Overall rating must be between 1 and 5'
      });
    }

    // Validate category ratings
    const { quality, punctuality, communication, professionalism } = feedbackData.categoryRatings;
    if (!quality || !punctuality || !communication || !professionalism) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all category ratings'
      });
    }

    if ([quality, punctuality, communication, professionalism].some(rating => rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'All category ratings must be between 1 and 5'
      });
    }

    // Validate wouldRecommend
    if (typeof feedbackData.wouldRecommend !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Recommendation field is required'
      });
    }

    // Create feedback
    const feedback = await Feedback.create(feedbackData);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error creating feedback:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating feedback',
      error: error.message
    });
  }
};

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Public
export const getAllFeedback = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      providerId, 
      serviceCategory, 
      minRating,
      sortBy = '-submittedAt',
      status = 'approved'
    } = req.query;

    // Build query
    const query = {};
    if (providerId) query.providerId = providerId;
    if (serviceCategory) query.serviceCategory = serviceCategory;
    if (minRating) query.overallRating = { $gte: Number(minRating) };
    if (status) query.status = status;

    // Execute query with pagination
    const feedback = await Feedback.find(query)
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const count = await Feedback.countDocuments(query);

    res.status(200).json({
      success: true,
      data: feedback,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalFeedback: count
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback',
      error: error.message
    });
  }
};

// @desc    Get feedback by ID
// @route   GET /api/feedback/:id
// @access  Public
export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback',
      error: error.message
    });
  }
};

// @desc    Get feedback statistics for a provider
// @route   GET /api/feedback/stats/:providerId
// @access  Public
export const getFeedbackStats = async (req, res) => {
  try {
    const { providerId } = req.params;

    const stats = await Feedback.aggregate([
      { $match: { providerId, status: 'approved' } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageOverallRating: { $avg: '$overallRating' },
          averageQuality: { $avg: '$categoryRatings.quality' },
          averagePunctuality: { $avg: '$categoryRatings.punctuality' },
          averageCommunication: { $avg: '$categoryRatings.communication' },
          averageProfessionalism: { $avg: '$categoryRatings.professionalism' },
          recommendationCount: {
            $sum: { $cond: ['$wouldRecommend', 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          averageOverallRating: { $round: ['$averageOverallRating', 1] },
          averageQuality: { $round: ['$averageQuality', 1] },
          averagePunctuality: { $round: ['$averagePunctuality', 1] },
          averageCommunication: { $round: ['$averageCommunication', 1] },
          averageProfessionalism: { $round: ['$averageProfessionalism', 1] },
          recommendationPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$recommendationCount', '$totalReviews'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    // Get rating breakdown
    const breakdown = await Feedback.aggregate([
      { $match: { providerId, status: 'approved' } },
      {
        $group: {
          _id: '$overallRating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const ratingBreakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    breakdown.forEach(item => {
      ratingBreakdown[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        stats: stats[0] || {
          totalReviews: 0,
          averageOverallRating: 0,
          averageQuality: 0,
          averagePunctuality: 0,
          averageCommunication: 0,
          averageProfessionalism: 0,
          recommendationPercentage: 0
        },
        ratingBreakdown
      }
    });

  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback stats',
      error: error.message
    });
  }
};

// @desc    Update feedback status (approve/reject)
// @route   PATCH /api/feedback/:id/status
// @access  Private (Admin)
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending'
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback status updated successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating feedback status',
      error: error.message
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private (Admin)
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting feedback',
      error: error.message
    });
  }
};
