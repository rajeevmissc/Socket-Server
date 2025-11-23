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

  // 📤 Submit verification data + Cloudinary uploads
  submitVerification: async (req, res) => {
    try {

      // ---------------------------------------------------
      // 1️⃣ Parse JSON from FormData
      // ---------------------------------------------------
      if (!req.body.data) {
        return res.status(400).json({
          success: false,
          message: "Missing verification form data"
        });
      }

      const parsed = JSON.parse(req.body.data);

      const bookingId = parsed.bookingId;
      const verificationData = parsed.verification;
      const files = req.files;

      console.log("Parsed bookingId:", bookingId);

      // ---------------------------------------------------
      // 2️⃣ Validate booking exists
      // ---------------------------------------------------
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      // ---------------------------------------------------
      // 3️⃣ Cloudinary Upload Function
      // ---------------------------------------------------
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

      // ---------------------------------------------------
      // 4️⃣ Upload Both Files to Cloudinary
      // ---------------------------------------------------
      const idProofFile = await uploadToCloudinary(
        files?.idProof?.[0],
        "verification/idProofs"
      );

      const addressProofFile = await uploadToCloudinary(
        files?.addressProof?.[0],
        "verification/addressProofs"
      );

      // ---------------------------------------------------
      // 5️⃣ Create OR Update Verification
      // ---------------------------------------------------
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

      // ---------------------------------------------------
      // 6️⃣ Link Verification with Booking
      // ---------------------------------------------------
      booking.verificationId = verification._id;
      await booking.save();

      // ---------------------------------------------------
      // 7️⃣ Final Response
      // ---------------------------------------------------
      return res.status(201).json({
        success: true,
        data: verification,
        message: "Verification data submitted successfully"
      });

    } catch (error) {
      console.error("Submit verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit verification data",
        error: error.message
      });
    }
  },

  // 📄 Fetch verification by booking id
  getVerificationByBooking: async (req, res) => {
    try {
      const { bookingId } = req.params;

      const verification = await Verification.findOne({ bookingId });

      if (!verification) {
        return res.status(404).json({
          success: false,
          message: "Verification data not found"
        });
      }

      res.json({
        success: true,
        data: verification
      });

    } catch (error) {
      console.error("Get verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch verification data",
        error: error.message
      });
    }
  },

  // 🌐 Files are served from Cloudinary URLs
  getVerificationFile: async (req, res) => {
    return res.status(400).json({
      success: false,
      message: "Files are served directly from Cloudinary URL"
    });
  }
};

export default verificationController;
