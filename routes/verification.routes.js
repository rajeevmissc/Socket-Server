import express from 'express';
import multer from 'multer';
import verificationController from '../controllers/verification.controller.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

// SUBMIT VERIFICATION (with Cloudinary uploads)
router.post(
  '/submit',
  authenticateToken,
  upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 }
  ]),
  verificationController.submitVerification
);

// GET VERIFICATION
router.get('/:bookingId', authenticateToken, verificationController.getVerificationByBooking);

// Cloudinary serves files — no local file route needed
router.get('/:verificationId/:fileType', verificationController.getVerificationFile);

export default router;


