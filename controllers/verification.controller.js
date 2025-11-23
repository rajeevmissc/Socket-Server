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
    // 1️⃣ Parse JSON from FormData
    const parsed = JSON.parse(req.body.data);

    const bookingId = parsed.bookingId;
    const verificationData = parsed.verification;
    const files = req.files;

    // Log to confirm
    console.log("Parsed bookingId:", bookingId);

    // 2️⃣ Validate booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 3️⃣ Upload to Cloudinary
    const uploadToCloudinary = (file, folder) => {
      return new Promise((resolve, reject) => {
        if (!file) return resolve(null);

        const uniqueName = `${uuidv4()}-${file.originalname}`;

        cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: uniqueName,
            resource_type: "auto",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              mimetype: file.mimetype,
              size: file.size,
              originalName: file.originalname,
            });
          }
        ).end(file.buffer);
      });
    };

    const idProofFile = await uploadToCloudinary(
      files?.idProof?.[0],
      "verification/idProofs"
    );
    const addressProofFile = await uploadToCloudinary(
      files?.addressProof?.[0],
      "verification/addressProofs"
    );

    // 4️⃣ Create/update verification
    let verification = await Verification.findOne({ bookingId });

    if (verification) {
      Object.assign(verification, verificationData);
      if (idProofFile) verification.idProofFile = idProofFile;
      if (addressProofFile) verification.addressProofFile = addressProofFile;
    } else {
      verification = new Verification({
        bookingId,
        userId: booking.userId,
        providerId: booking.providerId,
        ...verificationData,
        idProofFile,
        addressProofFile,
        status: "pending",
      });
    }

    await verification.save();

    // 5️⃣ Link verification to booking
    booking.verificationId = verification._id;
    await booking.save();

    return res.status(201).json({
      success: true,
      data: verification,
      message: "Verification data submitted successfully",
    });
  } catch (error) {
    console.error("Submit verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit verification data",
      error: error.message,
    });
  }
}

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

