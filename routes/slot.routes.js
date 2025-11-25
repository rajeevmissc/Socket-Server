// routes/slot.routes.js
import express from 'express';
import slotController from '../controllers/slot.controller.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Add this to your slot routes
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { providerId, date, slots } = req.body;
    
    const bulkOps = slots.map(slot => ({
      updateOne: {
        filter: {
          providerId,
          date: new Date(date),
          timeSlot: slot.timeSlot
        },
        update: {
          $set: {
            status: slot.status,
            providerId,
            date: new Date(date),
            timeSlot: slot.timeSlot
          }
        },
        upsert: true
      }
    }));
    
    await Slot.bulkWrite(bulkOps);
    
    res.json({ success: true, message: 'Slots updated successfully' });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update slots',
      error: error.message
    });
  }
});

// Fetch available slots
router.get('/:providerId', slotController.getAvailableSlots);

// Fetch booked slots
router.get('/:providerId/booked', slotController.getBookedSlots);

// Reserve slot (requires login)
router.post('/reserve', authenticateToken, slotController.reserveSlot);

// Confirm booking (can also require login)
router.post('/book', authenticateToken, slotController.confirmSlot);

export default router;

