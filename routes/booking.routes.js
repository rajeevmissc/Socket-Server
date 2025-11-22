// routes/booking.routes.js
import express from 'express';
import bookingController from '../controllers/booking.controller.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All booking routes require authentication
router.use(authenticateToken);

// Create a new booking
router.post('/', 
  bookingController.validateBooking,
  bookingController.createBooking
);

// Get user's bookings
router.get('/user', 
  bookingController.getUserBookings
);

// Get latest user booking
router.get(
  '/user/latest',
  bookingController.getLatestUserBooking
);

// Get provider's bookings (NEW)
router.get('/provider',
  bookingController.checkProvider,
  bookingController.getProviderBookings
);

//Get provider latset booking
router.get(
  '/provider/latest',
  bookingController.checkProvider,
  bookingController.getLatestProviderBooking
);

// Get all bookings (admin only)
router.get('/admin/all',
  bookingController.checkAdmin,
  bookingController.getAllBookings
);

// Update booking status
router.patch('/:bookingId/status',
  bookingController.updateBookingStatus
);

// Cancel booking
router.delete('/:bookingId',
  bookingController.cancelBooking
);


export default router;

