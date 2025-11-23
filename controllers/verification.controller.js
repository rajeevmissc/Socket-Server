// import Verification from '../models/Verification.model.js';
// import Booking from '../models/Booking.model.js';
// import path from 'path';
// import fs from 'fs/promises';
// import { v4 as uuidv4 } from 'uuid';

// const verificationController = {

//   // Submit verification data with files
//   submitVerification: async (req, res) => {
//     try {
//       const { bookingId, ...verificationData } = req.body;
//       const files = req.files;

//       // Validate booking exists
//       const booking = await Booking.findById(bookingId);
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       // Handle file uploads
//       const uploadDir = 'uploads/verification';
//       await fs.mkdir(uploadDir, { recursive: true });

//       const handleFileUpload = async (file) => {
//         if (!file) return null;
        
//         const fileExt = path.extname(file.originalname);
//         const fileName = `${uuidv4()}${fileExt}`;
//         const filePath = path.join(uploadDir, fileName);

//         await fs.rename(file.path, filePath);

//         return {
//           filename: fileName,
//           originalName: file.originalname,
//           mimetype: file.mimetype,
//           path: filePath,
//           size: file.size
//         };
//       };

//       const idProofFile = await handleFileUpload(files?.idProof?.[0]);
//       const addressProofFile = await handleFileUpload(files?.addressProof?.[0]);

//       // Create or update verification
//       let verification = await Verification.findOne({ bookingId });
      
//       if (verification) {
//         // Update existing verification
//         Object.assign(verification, verificationData);
//         if (idProofFile) verification.idProofFile = idProofFile;
//         if (addressProofFile) verification.addressProofFile = addressProofFile;
//       } else {
//         // Create new verification
//         verification = new Verification({
//           bookingId,
//           userId: booking.userId,
//           providerId: booking.providerId,
//           ...verificationData,
//           idProofFile,
//           addressProofFile,
//           status: 'pending'
//         });
//       }

//       await verification.save();

//       // Link verification to booking
//       booking.verificationId = verification._id;
//       await booking.save();

//       res.status(201).json({
//         success: true,
//         data: verification,
//         message: 'Verification data submitted successfully'
//       });

//     } catch (error) {
//       console.error('Submit verification error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to submit verification data',
//         error: error.message
//       });
//     }
//   },

//   // Get verification by booking ID
//   getVerificationByBooking: async (req, res) => {
//     try {
//       const { bookingId } = req.params;

//       const verification = await Verification.findOne({ bookingId });
//       if (!verification) {
//         return res.status(404).json({
//           success: false,
//           message: 'Verification data not found'
//         });
//       }

//       res.json({
//         success: true,
//         data: verification
//       });

//     } catch (error) {
//       console.error('Get verification error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to fetch verification data',
//         error: error.message
//       });
//     }
//   },

//   // Get verification file
//   getVerificationFile: async (req, res) => {
//     try {
//       const { verificationId, fileType } = req.params;

//       const verification = await Verification.findById(verificationId);
//       if (!verification) {
//         return res.status(404).json({
//           success: false,
//           message: 'Verification not found'
//         });
//       }

//       const fileInfo = verification[`${fileType}File`];
//       if (!fileInfo || !fileInfo.path) {
//         return res.status(404).json({
//           success: false,
//           message: 'File not found'
//         });
//       }

//       // Check if file exists
//       try {
//         await fs.access(fileInfo.path);
//       } catch {
//         return res.status(404).json({
//           success: false,
//           message: 'File not found on server'
//         });
//       }

//       res.setHeader('Content-Type', fileInfo.mimetype);
//       res.setHeader('Content-Disposition', `inline; filename="${fileInfo.originalName}"`);
      
//       const fileStream = fs.createReadStream(fileInfo.path);
//       fileStream.pipe(res);

//     } catch (error) {
//       console.error('Get verification file error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to fetch verification file',
//         error: error.message
//       });
//     }
//   }
// };


// export default verificationController;




import Verification from '../models/Verification.model.js';
import Booking from '../models/Booking.model.js';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const verificationController = {

  // 📤 Submit verification data + upload to Cloudinary
  submitVerification: async (req, res) => {
    try {
      const { bookingId, ...verificationData } = req.body;
      const files = req.files;

      // 1️⃣ Validate booking exists
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // 2️⃣ Upload file to Cloudinary (returns URL)
      const uploadToCloudinary = (file, folder) => {
        return new Promise((resolve, reject) => {
          if (!file) return resolve(null);

          const uniqueName = `${uuidv4()}-${file.originalname}`;

          cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: uniqueName,
              resource_type: "auto"
            },
            (error, result) => {
              if (error) return reject(error);
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                mimetype: file.mimetype,
                size: file.size,
                originalName: file.originalname
              });
            }
          ).end(file.buffer);
        });
      };

      // 3️⃣ Upload files
      const idProofFile = await uploadToCloudinary(files?.idProof?.[0], "verification/idProofs");
      const addressProofFile = await uploadToCloudinary(files?.addressProof?.[0], "verification/addressProofs");

      // 4️⃣ Create or update verification record
      let verification = await Verification.findOne({ bookingId });

      if (verification) {
        // Update existing
        Object.assign(verification, verificationData);
        if (idProofFile) verification.idProofFile = idProofFile;
        if (addressProofFile) verification.addressProofFile = addressProofFile;
      } else {
        // Create new
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

      // 5️⃣ Link verification with booking
      booking.verificationId = verification._id;
      await booking.save();

      return res.status(201).json({
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

  // 📄 Get verification data by booking id
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

  // 🌐 No need to fetch file manually — Cloudinary URL is public
  getVerificationFile: async (req, res) => {
    return res.status(400).json({
      success: false,
      message: "Files are served directly from Cloudinary URL"
    });
  }
};

export default verificationController;
