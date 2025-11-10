// controllers/authController.js - Authentication controller with Twilio
import bcrypt from 'bcryptjs';
import User from '../models/Users.js';
import OTP from '../models/OTP.js';
import Session from '../models/Session.js';
import { generateOTP, generateToken } from '../utils/authUtils.js';
import { sendSMS, sendWhatsApp } from '../utils/smsUtils.js';
import { AppError } from '../utils/errorUtils.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Provider from '../models/Provider.js';

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTPController = asyncHandler(async (req, res) => {
  const { phoneNumber, countryCode, sendViaWhatsApp = false } = req.body;

  // Clean and format phone number
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  const fullPhoneNumber = `+${countryCode}${cleanPhoneNumber}`;

  // Define admin numbers (can move to env/config)
  const adminNumbers = ['+916306539816', '+916306539817'];

  // Check if user already exists
  let user = await User.findOne({ phoneNumber: fullPhoneNumber });

  // If user doesn't exist → create and assign role dynamically
 // If user doesn't exist → create and assign role dynamically
if (!user) {
  let role = 'user';
  let providerId = null;

  // Check if number exists in Provider DB
  const providerExists = await Provider.findOne({
    'personalInfo.phone': fullPhoneNumber
  });

  if (providerExists) {
    role = 'provider';
    providerId = providerExists._id;
  }

  // Check if number is admin
  if (adminNumbers.includes(fullPhoneNumber)) {
    role = 'admin';
  }

  // Create new user with role and providerId (if applicable)
  user = new User({
    phoneNumber: fullPhoneNumber,
    countryCode,
    role,
    providerId,
    stats: { accountCreatedIP: req.ip }
  });

  await user.save();

} else {
  // If user exists, ensure role/providerId are synced
  const providerExists = await Provider.findOne({
    'personalInfo.phone': fullPhoneNumber
  });
  const isAdmin = adminNumbers.includes(fullPhoneNumber);

  if (providerExists) {
    if (user.role !== 'provider') {
      user.role = 'provider';
    }
    if (!user.providerId) {
      user.providerId = providerExists._id;
    }
    await user.save();
  } else if (isAdmin && user.role !== 'admin') {
    user.role = 'admin';
    user.providerId = null;
    await user.save();
  }
}


  // Prevent frequent OTP requests (spam control)
  const recentOTP = await OTP.findOne({
    phoneNumber: fullPhoneNumber,
    createdAt: { $gt: new Date(Date.now() - 60000) } // last 1 min
  });

  if (recentOTP) {
    throw new AppError('Please wait before requesting another OTP', 429);
  }

  // Clean up old OTPs
  await OTP.deleteMany({ phoneNumber: fullPhoneNumber });

  // Generate and hash OTP
  const otpCode = generateOTP();
  const hashedOTP = await bcrypt.hash(otpCode, 12);

  const otpDoc = new OTP({
    phoneNumber: fullPhoneNumber,
    otp: hashedOTP,
    purpose: 'login',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  await otpDoc.save();

  // Send OTP with professional template
  let messageSent;
  if (sendViaWhatsApp) {
    // Send via WhatsApp with professional template
    messageSent = await sendWhatsApp(fullPhoneNumber, otpCode, true, otpCode);
  } else {
    // Send via SMS with template (and WhatsApp fallback)
    messageSent = await sendSMS(fullPhoneNumber, otpCode, {
      isOTP: true,
      otpCode: otpCode
    });
  }

  if (!messageSent) {
    await OTP.deleteOne({ _id: otpDoc._id });
    throw new AppError('Failed to send verification code', 500);
  }

  res.status(200).json({
    success: true,
    message: 'Verification code sent successfully',
    data: {
      phoneNumber: fullPhoneNumber,
      sentVia: sendViaWhatsApp ? 'whatsapp' : 'sms',
      expiresIn: 600, // 10 min
      canResendAfter: 60 // 1 min
    }
  });
});

// @desc    Verify OTP and authenticate
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTPController = asyncHandler(async (req, res) => {
  const { phoneNumber, otp, deviceInfo = {} } = req.body;

  // Find valid OTP
  const otpRecord = await OTP.findOne({
    phoneNumber,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new AppError('Invalid or expired verification code', 400);
  }

  // Check maximum attempts
  if (otpRecord.attempts >= 5) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError('Too many incorrect attempts. Please request a new code.', 400);
  }

  // Verify OTP
  const isValidOTP = await bcrypt.compare(otp, otpRecord.otp);

  if (!isValidOTP) {
    await otpRecord.incrementAttempt();
    const remainingAttempts = 5 - otpRecord.attempts - 1;
    throw new AppError(`Invalid verification code. ${remainingAttempts} attempts remaining.`, 400);
  }

  // Mark OTP as used
  await otpRecord.markAsUsed();

  // Find and update user
  const user = await User.findOneAndUpdate(
    { phoneNumber },
    {
      isVerified: true,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!user) {
    throw new AppError('User account not found', 404);
  }

  // Update login stats
  await user.incrementLoginStats(req.ip);

  // Update provider status if applicable
  if (user.role === 'provider') {
    await Provider.findOneAndUpdate(
      { 'personalInfo.phone': user.phoneNumber },
      {
        'presence.isOnline': true,
        'presence.availabilityStatus': 'online',
        'businessInfo.lastActive': new Date()
      }
    );
  }

  // Generate JWT token
  const token = generateToken(user._id);

  // Create session
  const session = new Session({
    userId: user._id,
    token,
    deviceInfo: {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      ...deviceInfo
    }
  });
  await session.save();

  // Clean up old sessions (keep only last 5)
  const userSessions = await Session.find({ 
    userId: user._id, 
    isActive: true 
  }).sort({ createdAt: -1 });

  if (userSessions.length > 5) {
    const sessionsToDeactivate = userSessions.slice(5);
    await Session.updateMany(
      { _id: { $in: sessionsToDeactivate.map(s => s._id) } },
      { isActive: false }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    data: {
      user: user.toPublicJSON(),
      token,
      expiresIn: 30 * 24 * 60 * 60 // 30 days in seconds
    }
  });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTPController = asyncHandler(async (req, res) => {
  const { phoneNumber, sendViaWhatsApp = false } = req.body;

  if (!phoneNumber) {
    throw new AppError('Phone number is required', 400);
  }

  // Check recent OTP requests
  const recentOTP = await OTP.findOne({
    phoneNumber,
    createdAt: { $gt: new Date(Date.now() - 60000) }
  });

  if (recentOTP) {
    throw new AppError('Please wait before requesting another verification code', 429);
  }

  // Clean up old OTPs
  await OTP.deleteMany({ phoneNumber });

  // Generate new OTP
  const otpCode = generateOTP();
  const hashedOTP = await bcrypt.hash(otpCode, 12);

  const otpDoc = new OTP({
    phoneNumber,
    otp: hashedOTP,
    purpose: 'login',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  await otpDoc.save();

  // Prepare message
  const message = `Your ServiceConnect verification code is: ${otpCode}. Valid for 10 minutes.`;

  // Send via SMS or WhatsApp
  let messageSent;
  if (sendViaWhatsApp) {
    messageSent = await sendWhatsApp(phoneNumber, message);
  } else {
    messageSent = await sendSMS(phoneNumber, message);
  }

  if (!messageSent) {
    await OTP.deleteOne({ _id: otpDoc._id });
    throw new AppError('Failed to send verification code', 500);
  }

  res.status(200).json({
    success: true,
    message: 'Verification code resent successfully',
    data: {
      phoneNumber,
      sentVia: sendViaWhatsApp ? 'whatsapp' : 'sms',
      expiresIn: 600,
      canResendAfter: 60
    }
  });
});

// @desc    Logout current session
// @route   POST /api/auth/logout
// @access  Private
const logoutController = asyncHandler(async (req, res) => {
  // Deactivate current session safely
  await Session.updateOne(
    { _id: req.session._id, isActive: true },
    { isActive: false }
  );

  // Update provider presence if role is 'provider'
  if (req.userRole === 'provider') {
    await Provider.updateOne(
      { 'personalInfo.phone': req.userPhone },
      {
        'presence.isOnline': false,
        'presence.availabilityStatus': 'offline',
        'presence.lastSeen': new Date()
      }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Logout all sessions
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAllController = asyncHandler(async (req, res) => {
  // Deactivate all active sessions for the user
  await Session.updateMany(
    { userId: req.userId, isActive: true },
    { isActive: false }
  );

  // Update provider presence if role is 'provider'
  if (req.userRole === 'provider') {
    await Provider.updateOne(
      { 'personalInfo.phone': req.userPhone },
      {
        'presence.isOnline': false,
        'presence.availabilityStatus': 'offline',
        'presence.lastSeen': new Date()
      }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Logged out from all devices successfully'
  });
});

export {
  sendOTPController,
  verifyOTPController,
  resendOTPController,
  logoutController,
  logoutAllController
};



