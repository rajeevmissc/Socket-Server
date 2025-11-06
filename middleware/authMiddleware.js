// ---- Imports ----
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';
import Session from '../models/Session.js';
import { AppError } from '../utils/errorUtils.js';

// ---- Middleware ----

// Authenticate required token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(new AppError('Access token required', 401));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session exists and is active
    const session = await Session.findOne({
      token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return next(new AppError('Invalid or expired session', 401));
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return next(new AppError('User account not found or inactive', 401));
    }

    // Update session activity
    session.updateActivity();

    // Attach user and session to request
    req.user = user;
    req.session = session;
    req.userId = user._id;
    req.userRole = user.role;          // ✅ add role
    req.userPhone = user.phoneNumber;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

// Optional authentication (doesn't block if token missing/invalid)
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user && user.status === 'active') {
      req.user = user;
      req.userId = user._id;
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
};

// Require verified account (e.g., phone verification)
export const requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return next(new AppError('Phone number verification required', 403));
  }
  next();
};
