import { body, validationResult } from 'express-validator';
import { AppError} from '../utils/errorUtils.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return next(new AppError('Validation failed', 400, errorMessages));
  }
  
  next();
};

export const validateSendOTP = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10-15 digits')
    .matches(/^\d+$/)
    .withMessage('Phone number must contain only digits'),
  
  body('countryCode')
    .notEmpty()
    .withMessage('Country code is required')
    .isLength({ min: 1, max: 4 })
    .withMessage('Country code must be between 1-4 digits')
    .matches(/^\d+$/)
    .withMessage('Country code must contain only digits'),
  
  body('purpose')
    .optional()
    .isIn(['login', 'registration', 'password_reset', 'phone_verification'])
    .withMessage('Invalid purpose specified'),
    
  handleValidationErrors
];

export const validateVerifyOTP = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+\d{10,15}$/)
    .withMessage('Phone number must be in international format (+1234567890)'),
  
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('OTP must contain only digits'),
  
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Device info must be an object'),
    
  handleValidationErrors
];

export const validateUpdateProfile = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('profile.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
    
  handleValidationErrors
];

