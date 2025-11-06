// controllers/slot.controller.js
import Slot from '../models/Slot.model.js';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const slotController = {

  // Get available slots
// Get available slots
getAvailableSlots: async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch existing slots from DB
    let existingSlots = await Slot.find({
      providerId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    const existingTimeSlots = existingSlots.map(s => s.timeSlot);
    const missingSlots = TIME_SLOTS.filter(t => !existingTimeSlots.includes(t));

    if (missingSlots.length > 0) {
      const newSlots = missingSlots.map(timeSlot => ({
        providerId,
        date: startOfDay,
        timeSlot,
        status: 'available',
      }));
      const inserted = await Slot.insertMany(newSlots);
      existingSlots = existingSlots.concat(inserted);
    }

    const slots = TIME_SLOTS.map(timeSlot => {
      const slot = existingSlots.find(s => s.timeSlot === timeSlot);
      return {
        value: timeSlot,
        label: formatTime(timeSlot),
        hour: parseInt(timeSlot.split(':')[0]),
        status: slot ? slot.status : 'available',
        providerId,
        date,
      };
    });

    res.json({ success: true, data: slots });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slots',
      error: error.message,
    });
  }
},



  // Get booked slots
  getBookedSlots: async (req, res) => {
    try {
      const { providerId } = req.params;
      const { date } = req.query;

      const filter = { providerId, status: 'booked' };
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date = { $gte: startOfDay, $lte: endOfDay };
      }

      const bookedSlots = await Slot.find(filter).select('timeSlot date').lean();
      const bookedTimes = bookedSlots.map(slot => slot.timeSlot);

      res.json({ success: true, data: bookedTimes });

    } catch (error) {
      console.error('Get booked slots error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booked slots',
        error: error.message
      });
    }
  },

  // Reserve slot temporarily
  reserveSlot: async (req, res) => {
    try {
      const { providerId, date, timeSlot } = req.body;
      const userId = req.user._id;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      let slot = await Slot.findOne({
        providerId,
        date: { $gte: startOfDay, $lte: endOfDay },
        timeSlot
      });

      if (!slot) {
        slot = new Slot({
          providerId,
          date: startOfDay,
          timeSlot,
          status: 'available'
        });
      }

      if (slot.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: 'Slot is not available'
        });
      }

      slot.reservedBy = userId;
      slot.reservedUntil = new Date(Date.now() + 5 * 60 * 1000);
      await slot.save();

      res.json({
        success: true,
        reservationId: `RES-${Date.now()}`,
        expiresIn: 300
      });

    } catch (error) {
      console.error('Reserve slot error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reserve slot',
        error: error.message
      });
    }
  },

  // Confirm slot booking
  confirmSlot: async (req, res) => {
    try {
      const { providerId, date, timeSlot, bookingId } = req.body;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const slot = await Slot.findOneAndUpdate(
        {
          providerId,
          date: { $gte: startOfDay, $lte: endOfDay },
          timeSlot,
          status: 'available'
        },
        {
          status: 'booked',
          bookingId
        },
        { new: true }
      );

      if (!slot) {
        return res.status(400).json({
          success: false,
          message: 'Slot is no longer available'
        });
      }

      res.json({ success: true, data: slot });

    } catch (error) {
      console.error('Confirm slot error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm slot',
        error: error.message
      });
    }
  }
};

// Helper function
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default slotController;
