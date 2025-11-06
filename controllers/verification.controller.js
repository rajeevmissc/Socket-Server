import Verification from '../models/Verification.model.js';
import Booking from '../models/Booking.model.js';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const verificationController = {

  // Submit verification data with files
  submitVerification: async (req, res) => {
    try {
      const { bookingId, ...verificationData } = req.body;
      const files = req.files;

      // Validate booking exists
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Handle file uploads
      const uploadDir = 'uploads/verification';
      await fs.mkdir(uploadDir, { recursive: true });

      const handleFileUpload = async (file) => {
        if (!file) return null;
        
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.rename(file.path, filePath);

        return {
          filename: fileName,
          originalName: file.originalname,
          mimetype: file.mimetype,
          path: filePath,
          size: file.size
        };
      };

      const idProofFile = await handleFileUpload(files?.idProof?.[0]);
      const addressProofFile = await handleFileUpload(files?.addressProof?.[0]);

      // Create or update verification
      let verification = await Verification.findOne({ bookingId });
      
      if (verification) {
        // Update existing verification
        Object.assign(verification, verificationData);
        if (idProofFile) verification.idProofFile = idProofFile;
        if (addressProofFile) verification.addressProofFile = addressProofFile;
      } else {
        // Create new verification
        verification = new Verification({
          bookingId,
          userId: booking.userId,
          providerId: booking.providerId,
          ...verificationData,
          idProofFile,
          addressProofFile,
          status: 'pending'
        });
      }

      await verification.save();

      // Link verification to booking
      booking.verificationId = verification._id;
      await booking.save();

      res.status(201).json({
        success: true,
        data: verification,
        message: 'Verification data submitted successfully'
      });

    } catch (error) {
      console.error('Submit verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification data',
        error: error.message
      });
    }
  },

  // Get verification by booking ID
  getVerificationByBooking: async (req, res) => {
    try {
      const { bookingId } = req.params;

      const verification = await Verification.findOne({ bookingId });
      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Verification data not found'
        });
      }

      res.json({
        success: true,
        data: verification
      });

    } catch (error) {
      console.error('Get verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification data',
        error: error.message
      });
    }
  },

  // Get verification file
  getVerificationFile: async (req, res) => {
    try {
      const { verificationId, fileType } = req.params;

      const verification = await Verification.findById(verificationId);
      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Verification not found'
        });
      }

      const fileInfo = verification[`${fileType}File`];
      if (!fileInfo || !fileInfo.path) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check if file exists
      try {
        await fs.access(fileInfo.path);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      res.setHeader('Content-Type', fileInfo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.originalName}"`);
      
      const fileStream = fs.createReadStream(fileInfo.path);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Get verification file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification file',
        error: error.message
      });
    }
  }
};

export default verificationController;