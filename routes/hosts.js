import express from 'express';
import Host from '../models/Host.js';
import { 
  uploadProfilePhoto, 
  uploadAdditionalPhotos, 
  uploadAuditionVideo, 
  uploadAadharCard,
  handleFileUpload, 
  checkVideoDuration, 
  deleteFile 
} from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function to safely delete file
const safeDeleteFile = (filename) => {
  if (!filename) return;
  try {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Upload profile photo
router.post('/:id/profile-photo', uploadProfilePhoto, handleFileUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No file uploaded' 
      });
    }

    const host = await Host.findById(req.params.id);
    if (!host) {
      // Clean up the uploaded file if host not found
      safeDeleteFile(req.file.filename);
      return res.status(404).json({ 
        status: 'error',
        message: 'Host not found' 
      });
    }

    // If there's an existing profile photo, delete it
    if (host.profilePhoto && host.profilePhoto.filename) {
      safeDeleteFile(host.profilePhoto.filename);
    }

    // Update host's profile photo
    host.profilePhoto = {
      url: req.file.url,
      filename: req.file.filename,
      uploadDate: new Date()
    };

    await host.save();
    res.status(200).json({
      status: 'success',
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: host.profilePhoto
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message || 'Something went wrong!' 
    });
    next(error);
  }
});

// Upload additional photos
router.post('/:id/additional-photos', uploadAdditionalPhotos, handleFileUpload, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No files uploaded' 
      });
    }

    const host = await Host.findById(req.params.id);
    if (!host) {
      // Clean up uploaded files if host not found
      req.files.forEach(file => {
        safeDeleteFile(file.filename);
      });
      return res.status(404).json({ 
        status: 'error',
        message: 'Host not found' 
      });
    }

    // Add new photos to additionalPhotos array
    const newPhotos = req.files.map(file => ({
      url: file.url,
      filename: file.filename,
      uploadDate: new Date()
    }));

    host.additionalPhotos.push(...newPhotos);
    await host.save();

    res.status(200).json({
      status: 'success',
      message: 'Additional photos uploaded successfully',
      data: {
        photos: newPhotos
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get host's photos
router.get('/:id/photos', async (req, res, next) => {
  try {
    const host = await Host.findById(req.params.id, 'profilePhoto additionalPhotos');
    if (!host) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Host not found' 
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        profilePhoto: host.profilePhoto,
        additionalPhotos: host.additionalPhotos
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete an additional photo
router.delete('/:hostId/photos/:photoId', async (req, res, next) => {
  try {
    const { hostId, photoId } = req.params;
    
    const host = await Host.findById(hostId);
    if (!host) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Host not found' 
      });
    }

    const photoIndex = host.additionalPhotos.findIndex(photo => photo._id.toString() === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Photo not found' 
      });
    }

    // Delete the file from the filesystem
    const photo = host.additionalPhotos[photoIndex];
    safeDeleteFile(photo.filename);

    // Remove from the array
    host.additionalPhotos.splice(photoIndex, 1);
    await host.save();

    res.status(200).json({ 
      status: 'success',
      message: 'Photo deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// Upload or update audition video
router.post(
  '/:id/audition-video',
  uploadAuditionVideo,
  checkVideoDuration,
  handleFileUpload,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          status: 'error',
          message: 'No video file uploaded' 
        });
      }

      const host = await Host.findById(req.params.id);
      if (!host) {
        safeDeleteFile(req.file.filename);
        return res.status(404).json({ 
          status: 'error',
          message: 'Host not found' 
        });
      }

      // If there's an existing audition video, delete it
      if (host.auditionVideo && host.auditionVideo.filename) {
        safeDeleteFile(host.auditionVideo.filename);
      }

      // Update host's audition video
      host.auditionVideo = {
        url: req.file.url,
        filename: req.file.filename,
        mimeType: req.file.mimeType,
        duration: req.file.duration,
        uploadDate: new Date()
      };

      await host.save();
      res.status(200).json({
        status: 'success',
        message: 'Audition video uploaded successfully',
        data: {
          video: host.auditionVideo
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get audition video
router.get('/:id/audition-video', async (req, res, next) => {
  try {
    const host = await Host.findById(req.params.id, 'auditionVideo');
    if (!host) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Host not found' 
      });
    }
    
    if (!host.auditionVideo) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No audition video found' 
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: host.auditionVideo
    });
  } catch (error) {
    next(error);
  }
});

// Delete audition video
router.delete('/:id/audition-video', async (req, res, next) => {
  try {
    const host = await Host.findById(req.params.id);
    if (!host) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Host not found' 
      });
    }

    if (!host.auditionVideo) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No audition video found' 
      });
    }

    // Delete the file from the filesystem
    safeDeleteFile(host.auditionVideo.filename);

    // Remove the audition video
    host.auditionVideo = null;
    await host.save();

    res.status(200).json({ 
      status: 'success',
      message: 'Audition video deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to validate Aadhar number
const isValidAadharNumber = (number) => {
  if (!number) return true; // Optional field
  const aadharRegex = /^\d{12}$/;
  return aadharRegex.test(number);
};

// Upload or update Aadhar card
router.post(
  '/:id/aadhar-card',
  uploadAadharCard,
  handleFileUpload,
  async (req, res, next) => {
    try {
      const { aadharNumber } = req.body;
      const files = req.files || {};
      
      // Log received files for debugging (remove in production)
      console.log('Received files:', JSON.stringify(files, null, 2));
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Ensure files is an object
      if (!files || typeof files !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'No files were uploaded or invalid file format'
        });
      }

      // Validate request
      if ((!files || !files.aadharFront) && !aadharNumber) {
        // Clean up uploaded files if any
        if (files) {
          Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => safeDeleteFile(file.filename));
          });
        }
        return res.status(400).json({
          status: 'error',
          message: 'Aadhar front image or Aadhar number is required'
        });
      }

      // Validate Aadhar number format
      if (aadharNumber && !isValidAadharNumber(aadharNumber)) {
        // Clean up uploaded files if any
        if (files) {
          Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => safeDeleteFile(file.filename));
          });
        }
        return res.status(400).json({
          status: 'error',
          message: 'Invalid Aadhar number. Must be 12 digits.'
        });
      }

      const host = await Host.findById(req.params.id);
      if (!host) {
        // Clean up uploaded files
        if (files) {
          Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => safeDeleteFile(file.filename));
          });
        }
        return res.status(404).json({
          status: 'error',
          message: 'Host not found'
        });
      }

      // Process Aadhar card upload
      if (files && Object.keys(files).length > 0) {
        try {
          // Delete old files if they exist and new ones are being uploaded
          if (files.aadharFront && Array.isArray(files.aadharFront) && files.aadharFront[0] && host.aadharCard?.front?.filename) {
            safeDeleteFile(host.aadharCard.front.filename);
          }
          if (files.aadharBack && Array.isArray(files.aadharBack) && files.aadharBack[0] && host.aadharCard?.back?.filename) {
            safeDeleteFile(host.aadharCard.back.filename);
          }

          // Update Aadhar card info
          if (files.aadharFront && Array.isArray(files.aadharFront) && files.aadharFront[0]) {
            const frontFile = files.aadharFront[0];
            host.aadharCard = host.aadharCard || {};
            host.aadharCard.front = {
              url: frontFile.path ? `/${frontFile.path}` : frontFile.url,
              filename: frontFile.filename,
              mimeType: frontFile.mimetype,
              uploadDate: new Date()
            };
          }

          if (files.aadharBack && Array.isArray(files.aadharBack) && files.aadharBack[0]) {
            const backFile = files.aadharBack[0];
            host.aadharCard = host.aadharCard || {};
            host.aadharCard.back = {
              url: backFile.path ? `/${backFile.path}` : backFile.url,
              filename: backFile.filename,
              mimeType: backFile.mimetype,
              uploadDate: new Date()
            };
          }
        } catch (fileError) {
          console.error('Error processing file uploads:', fileError);
          // Clean up any uploaded files if there was an error
          if (files) {
            Object.values(files).forEach(fileArray => {
              if (Array.isArray(fileArray)) {
                fileArray.forEach(file => {
                  if (file && file.filename) {
                    safeDeleteFile(file.filename);
                  }
                });
              }
            });
          }
          return res.status(500).json({
            status: 'error',
            message: 'Error processing file uploads'
          });
        }
      }

      // Update Aadhar number if provided
      if (aadharNumber) {
        host.aadharCard = host.aadharCard || {};
        host.aadharCard.number = aadharNumber;
      }

      // Reset verification status when Aadhar is updated
      if (files || aadharNumber) {
        host.aadharCard.verified = false;
      }

      await host.save();

      res.status(200).json({
        status: 'success',
        message: 'Aadhar card information updated successfully',
        data: {
          aadharCard: host.aadharCard
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get Aadhar card info
router.get('/:id/aadhar-card', async (req, res, next) => {
  try {
    const host = await Host.findById(req.params.id, 'aadharCard');
    if (!host) {
      return res.status(404).json({
        status: 'error',
        message: 'Host not found'
      });
    }

    if (!host.aadharCard) {
      return res.status(404).json({
        status: 'error',
        message: 'Aadhar card not found for this host'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        aadharCard: host.aadharCard
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete Aadhar card
router.delete('/:id/aadhar-card', async (req, res, next) => {
  try {
    const host = await Host.findById(req.params.id);
    if (!host) {
      return res.status(404).json({
        status: 'error',
        message: 'Host not found'
      });
    }

    if (!host.aadharCard || (!host.aadharCard.front && !host.aadharCard.back && !host.aadharCard.number)) {
      return res.status(404).json({
        status: 'error',
        message: 'No Aadhar card found for this host'
      });
    }

    // Delete files from filesystem
    try {
      if (host.aadharCard.front?.filename) {
        deleteFile(host.aadharCard.front.filename);
      }
      if (host.aadharCard.back?.filename) {
        deleteFile(host.aadharCard.back.filename);
      }
    } catch (fileError) {
      console.error('Error deleting Aadhar card files:', fileError);
      // Continue with deletion even if file deletion fails
    }

    try {
      // Remove Aadhar card data
      host.aadharCard = {
        front: null,
        back: null,
        number: '',
        verified: false,
        verificationDate: null
      };

      await host.save();

      res.status(200).json({
        status: 'success',
        message: 'Aadhar card information deleted successfully'
      });
    } catch (dbError) {
      console.error('Error updating database:', dbError);
      return res.status(500).json({
        status: 'error',
        message: 'Error deleting Aadhar card information from database'
      });
    }
  } catch (error) {
    console.error('Unexpected error in Aadhar card deletion:', error);
    next(error);
  }
});

// Update host profile fields (name, gender, dob, bio, knownLanguages)
router.put('/:id/profile', async (req, res, next) => {
  try {
    const { name, gender, dob, bio, knownLanguages } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (gender !== undefined) updateFields.gender = gender;
    if (dob !== undefined) updateFields.dob = dob;
    if (bio !== undefined) updateFields.bio = bio;
    if (knownLanguages !== undefined) updateFields.knownLanguages = knownLanguages;

    const host = await Host.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!host) {
      return res.status(404).json({
        status: 'error',
        message: 'Host not found'
      });
    }
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        host: {
          _id: host._id,
          name: host.name,
          gender: host.gender,
          dob: host.dob,
          bio: host.bio,
          knownLanguages: host.knownLanguages
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Something went wrong!'
    });
    next(error);
  }
});

export default router;
