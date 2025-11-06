// import express from 'express';

// const router = express.Router();

// const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

// function formatTime(timeStr) {
//   const [hours, minutes] = timeStr.split(':');
//   const hour = parseInt(hours);
//   const ampm = hour >= 12 ? 'PM' : 'AM';
//   const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
//   return `${displayHour}:${minutes} ${ampm}`;
// }

// router.get('/:providerId', async (req, res) => {
//   try {
//     const { providerId } = req.params;
//     const { date } = req.query;

//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: 'Date is required'
//       });
//     }

//     const slots = TIME_SLOTS.map(timeSlot => ({
//       value: timeSlot,
//       label: formatTime(timeSlot),
//       hour: parseInt(timeSlot.split(':')[0]),
//       status: 'available',
//       providerId,
//       date
//     }));

//     res.json({
//       success: true,
//       data: slots
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// });

// router.get('/:providerId/booked', async (req, res) => {
//   res.json({ success: true, data: [] });
// });

// router.post('/reserve', async (req, res) => {
//   res.json({ success: true, reservationId: `RES-${Date.now()}`, expiresIn: 300 });
// });

// router.post('/book', async (req, res) => {
//   res.json({ success: true, data: {} });
// });

// export default router;


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
