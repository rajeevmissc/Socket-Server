// controllers/booking.controller.js
import Booking from '../models/Booking.model.js';
import Slot from '../models/Slot.model.js';
import Verification from '../models/Verification.model.js';
import User from '../models/Users.js'; // Add this import
import Provider from '../models/Provider.js'; 
import { walletService } from '../services/wallet.service.js';
import { sendBookingNotifications, sendCancellationNotifications } from '../utils/smsUtils.js';

const bookingController = {

  // Validate booking data
  validateBooking: (req, res, next) => {
    const { date, timeSlot, providerId, mode, price } = req.body;

    if (!date || !timeSlot || !providerId || !mode || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if date is in the future
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Booking date must be today or in the future'
      });
    }

    next();
  },

    // Create new booking
createBooking: async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('booking coming data', req.body);
    const { providerId, providerName, date, timeSlot, mode, duration, price, verificationData } = req.body;

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // Find or create slot
    let slot = await Slot.findOne({ providerId, date: bookingDate, timeSlot });
    if (!slot) {
      slot = new Slot({ providerId, date: bookingDate, timeSlot, status: 'available' });
    }

    if (slot.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Slot is not available'
      });
    }

    // Check wallet balance (1x requirement)
    const requiredBalance = price * 1;
    const walletBalance = await walletService.getBalance(userId);
    if (walletBalance < requiredBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        requiredBalance,
        currentBalance: walletBalance
      });
    }

    // Create booking
    const booking = new Booking({
      userId,
      providerId,
      providerName,
      date: bookingDate,
      timeSlot,
      mode,
      duration,
      price,
      status: 'verification_pending'
    });
    await booking.save();

    if (verificationData) {
      const verification = new Verification({
        bookingId: booking._id,
        userId,
        providerId,
        ...verificationData,
        status: 'pending'
      });
      await verification.save();

      // Link verification to booking
      booking.verificationId = verification._id;
      await booking.save();
    }

    // Update slot to booked
    slot.status = 'booked';
    slot.bookingId = booking._id;
    await slot.save();

    // ⛔ Skip wallet deduction
    // const walletTransaction = await walletService.deduct(
    //   userId,
    //   price,
    //   `Booking payment for ${providerName}`,
    //   booking._id
    // );
    // booking.walletTransactionId = walletTransaction.transactionId;
    // await booking.save();

    // 📱 SEND WHATSAPP NOTIFICATIONS TO USER AND PROVIDER
    try {
      // Fetch user and provider details for phone numbers
      const [user, provider] = await Promise.all([
        User.findById(userId).select('phoneNumber countryCode profile'),
        Provider.findById(providerId).select('personalInfo.phone personalInfo.firstName personalInfo.lastName')
      ]);
      
      console.log('User details:', user);
      console.log('Provider details:', provider);

      let userPhone = null;
      let providerPhone = null;
      let finalProviderName = providerName;

      // Extract user phone number
      if (user?.phoneNumber && user?.countryCode) {
        userPhone = `${user.countryCode}${user.phoneNumber}`.replace(/\+/g, '');
      }

      // Extract provider phone number and name
      if (provider?.personalInfo?.phone) {
        providerPhone = provider.personalInfo.phone;
        // Use provider's actual name if available
        if (provider.personalInfo.firstName && provider.personalInfo.lastName) {
          finalProviderName = `${provider.personalInfo.firstName} ${provider.personalInfo.lastName}`;
        } else if (provider.personalInfo.fullName) {
          finalProviderName = provider.personalInfo.fullName;
        }
      }

      // Extract user name
      const userName = user?.profile?.firstName 
        ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
        : 'User';

      console.log('Notification details:', {
        userPhone,
        providerPhone,
        userName,
        providerName: finalProviderName
      });

      if (userPhone && providerPhone) {
        // Send notifications (non-blocking)
        sendBookingNotifications({
          userPhone: userPhone.slice(-12),
          providerPhone: providerPhone.slice(-12),
          userName: userName,
          providerName: finalProviderName,
          date: bookingDate,
          timeSlot,
          mode,
          price,
          bookingId: booking._id.toString()
        }).catch(err => {
          console.error('⚠️ Notification sending failed (non-critical):', err);
        });
        
        console.log('✅ Notifications sent successfully');
      } else {
        console.warn('⚠️ Could not send notifications: Missing phone numbers', {
          hasUserPhone: !!userPhone,
          hasProviderPhone: !!providerPhone
        });
      }
    } catch (notificationError) {
      // Don't fail the booking if notifications fail
      console.error('⚠️ Notification error (non-critical):', notificationError);
    }

    res.status(201).json({
      success: true,
      data: {
        booking,
        verificationId: booking.verificationId
      },
      message: 'Booking created successfully (verification pending)'
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
},

  // ✅ NEW: Update booking verification status
  updateVerificationStatus: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status, verificationNotes } = req.body;

      const booking = await Booking.findById(bookingId).populate('verificationId');
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Update verification status
      if (booking.verificationId) {
        booking.verificationId.status = status;
        booking.verificationId.verificationNotes = verificationNotes;
        booking.verificationId.verifiedBy = req.user._id;
        booking.verificationId.verifiedAt = new Date();
        await booking.verificationId.save();

        // Update booking status based on verification
        if (status === 'verified') {
          booking.status = 'confirmed';
        } else if (status === 'rejected') {
          booking.status = 'cancelled';
        }
        await booking.save();
      }

      res.json({
        success: true,
        data: booking,
        message: `Verification ${status} successfully`
      });

    } catch (error) {
      console.error('Update verification status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update verification status',
        error: error.message
      });
    }
  },

  // ✅ NEW: Get booking with verification details
  getBookingWithVerification: async (req, res) => {
    try {
      const { bookingId } = req.params;

      const booking = await Booking.findById(bookingId)
        .populate('verificationId')
        .populate('userId', 'name email phone')
        .populate('providerId', 'name email');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: booking
      });

    } catch (error) {
      console.error('Get booking with verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booking details',
        error: error.message
      });
    }
  },

  // Get user bookings
  getUserBookings: async (req, res) => {
    try {
      const userId = req.user._id;

      const bookings = await Booking.find({ userId })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: bookings
      });

    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }
  },

// Get latest booking of the user
getLatestUserBooking: async (req, res) => {
  try {
    const userId = req.user._id;

    const latestBooking = await Booking.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('providerId', 'name email phone');

    res.json({
      success: true,
      data: latestBooking
    });

  } catch (error) {
    console.error('Latest user booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest user booking',
      error: error.message
    });
  }
},
  
  // Get provider bookings (NEW)
  getProviderBookings: async (req, res) => {
    try {
      const providerId = req.user.providerId;
      const { date, status } = req.query;

      const filter = { providerId };
      if (date) {
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);
        filter.date = queryDate;
      }
      if (status) filter.status = status;

      const bookings = await Booking.find(filter)
        .sort({ date: 1, timeSlot: 1 })
        .populate('userId', 'name email phone');

      // Add userName to each booking for easier display
      const bookingsWithUserName = bookings.map(booking => ({
        ...booking.toObject(),
        userName: booking.userId?.name || 'Unknown User'
      }));

      res.json({
        success: true,
        data: bookingsWithUserName
      });

    } catch (error) {
      console.error('Get provider bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch provider bookings',
        error: error.message
      });
    }
  },

  // Get latest booking of provider
getLatestProviderBooking: async (req, res) => {
  try {
    const providerId = req.user.providerId;

    const latestBooking = await Booking.findOne({ providerId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone');

    const modified = latestBooking
      ? {
          ...latestBooking.toObject(),
          userName: latestBooking.userId?.name || "Unknown User"
        }
      : null;

    res.json({
      success: true,
      data: modified
    });

  } catch (error) {
    console.error('Latest provider booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest provider booking',
      error: error.message
    });
  }
},

  // Get all bookings (admin)
  getAllBookings: async (req, res) => {
    try {
      const { date, providerId, status } = req.query;

      const filter = {};
      if (date) {
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);
        filter.date = queryDate;
      }
      if (providerId) filter.providerId = providerId;
      if (status) filter.status = status;

      const bookings = await Booking.find(filter)
        .sort({ createdAt: -1 })
        .populate('userId', 'name email phone')
        .populate('providerId', 'name email');

      // Add userName and providerName to each booking
      const bookingsWithNames = bookings.map(booking => ({
        ...booking.toObject(),
        userName: booking.userId?.name || 'Unknown User',
        providerName: booking.providerId?.name || booking.providerName || 'Unknown Provider'
      }));

      res.json({
        success: true,
        data: bookingsWithNames
      });

    } catch (error) {
      console.error('Get all bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }
  },

  // Update booking status
  updateBookingStatus: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if user has permission to update
      const userId = req.user._id.toString();
      const isProvider = booking.providerId.toString() === userId;
      const isUser = booking.userId.toString() === userId;
      const isAdmin = req.user.role === 'admin' || req.user.isAdmin;

      if (!isProvider && !isUser && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this booking'
        });
      }

      booking.status = status;
      await booking.save();

      // Sync slot status
      if (status === 'cancelled') {
        await Slot.updateOne(
          { bookingId: booking._id },
          { status: 'available', bookingId: null }
        );
      } else if (status === 'confirmed') {
        await Slot.updateOne(
          { bookingId: booking._id },
          { status: 'booked' }
        );
      }

      res.json({
        success: true,
        data: booking,
        message: 'Booking status updated'
      });

    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking',
        error: error.message
      });
    }
  },

  // Cancel booking
  cancelBooking: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user._id;

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if user is either the patient or the provider
      const isUser = booking.userId.toString() === userId.toString();
      const isProvider = booking.providerId.toString() === userId.toString();

      if (!isUser && !isProvider) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to cancel this booking'
        });
      }

      if (booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled'
        });
      }

      booking.status = 'cancelled';
      await booking.save();

      // Update slot
      await Slot.updateOne(
        { bookingId: booking._id },
        { status: 'available', bookingId: null }
      );

      // Optionally refund to wallet if user is canceling
      if (isUser && booking.walletTransactionId) {
        try {
          await walletService.refund(
            booking.userId,
            booking.price,
            `Refund for cancelled booking with ${booking.providerName}`,
            booking._id
          );
        } catch (refundError) {
          console.error('Refund error:', refundError);
          // Continue even if refund fails
        }
      }

      // 📱 SEND CANCELLATION NOTIFICATIONS
      try {
        const [user, provider] = await Promise.all([
          User.findById(booking.userId).select('name phone'),
          User.findById(booking.providerId).select('name phone')
        ]);

        if (user?.phone && provider?.phone) {
          sendCancellationNotifications({
            userPhone: user.phone,
            providerPhone: provider.phone,
            userName: user.name,
            providerName: booking.providerName,
            date: booking.date,
            timeSlot: booking.timeSlot,
            bookingId: booking._id.toString(),
            cancelledBy: isUser ? 'user' : 'provider'
          }).catch(err => {
            console.error('⚠️ Cancellation notification failed (non-critical):', err);
          });
        }
      } catch (notificationError) {
        console.error('⚠️ Cancellation notification error (non-critical):', notificationError);
      }

      res.json({
        success: true,
        data: booking,
        message: 'Booking cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  },

  // Check admin middleware
  checkAdmin: (req, res, next) => {
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },

  // Check provider middleware (NEW)
  checkProvider: (req, res, next) => {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Provider access required'
      });
    }
    next();
  }

};

export default bookingController;











