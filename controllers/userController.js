// controllers/userController.js - User management controller
import User from '../models/Users.js';
import Session from '../models/Session.js';
import { AppError } from '../utils/errorUtils.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfileController = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-__v');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: user.toPublicJSON()
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfileController = asyncHandler(async (req, res) => {
  const { profile, preferences } = req.body;

  const updateData = { updatedAt: new Date() };
  
  if (profile) {
    updateData.profile = { ...req.user.profile, ...profile };
  }
  
  if (preferences) {
    updateData.preferences = { ...req.user.preferences, ...preferences };
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-__v');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toPublicJSON()
    }
  });
});

// @desc    Get user sessions
// @route   GET /api/user/sessions
// @access  Private
const getSessionsController = asyncHandler(async (req, res) => {
  const sessions = await Session.find({
    userId: req.userId,
    isActive: true
  })
  .select('deviceInfo lastActivity createdAt')
  .sort({ lastActivity: -1 });

  res.status(200).json({
    success: true,
    data: {
      sessions: sessions.map(session => ({
        id: session._id,
        deviceInfo: session.deviceInfo,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt,
        isCurrent: session._id.toString() === req.session._id.toString()
      }))
    }
  });
});

// @desc    Terminate specific session
// @route   DELETE /api/user/sessions/:sessionId
// @access  Private
const terminateSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findOne({
    _id: sessionId,
    userId: req.userId,
    isActive: true
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  await session.deactivate();

  res.status(200).json({
    success: true,
    message: 'Session terminated successfully'
  });
});

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteAccountController = asyncHandler(async (req, res) => {
  const { confirmPassword } = req.body;

  // In a real app, you might want to require password confirmation
  // For OTP-only auth, we'll use a confirmation parameter

  if (confirmPassword !== 'DELETE_MY_ACCOUNT') {
    throw new AppError('Account deletion confirmation required', 400);
  }

  // Soft delete - mark account as deleted
  await User.findByIdAndUpdate(req.userId, {
    status: 'deleted',
    updatedAt: new Date()
  });

  // Deactivate all sessions
  await Session.updateMany(
    { userId: req.userId },
    { isActive: false }
  );

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

// @desc    Get user statistics
// @route   GET /api/user/stats
// @access  Private
const getUserStatsController = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  const activeSessions = await Session.countDocuments({
    userId: req.userId,
    isActive: true
  });

  const stats = {
    accountCreated: user.createdAt,
    totalLogins: user.stats.totalLogins || 0,
    lastLogin: user.stats.lastLogin,
    activeSessions,
    isVerified: user.isVerified,
    accountStatus: user.status
  };

  res.status(200).json({
    success: true,
    data: { stats }
  });
});

export {
  getProfileController,
  updateProfileController,
  getSessionsController,
  terminateSessionController,
  deleteAccountController,
  getUserStatsController
};
