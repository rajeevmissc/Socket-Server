import express from 'express';
import multer from 'multer';
import verificationController from '../controllers/verification.controller.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import path from 'path';
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'));
    }
  }
});

// Submit verification data with files
router.post('/submit', 
  authenticateToken,
  upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 }
  ]),
  verificationController.submitVerification
);

// Get verification by booking ID
router.get('/booking/:bookingId', 
  authenticateToken,
  verificationController.getVerificationByBooking
);

// Get verification file
router.get('/file/:verificationId/:fileType', 
  authenticateToken,
  verificationController.getVerificationFile
);

export default router;