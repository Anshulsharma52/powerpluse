const express = require('express');
const router = express.Router();
const { createBooking, getUserBookings, getStationBookings, updateBookingStatus, getAvailableSlots, getOwnerEarnings } = require('../controllers/bookingController');
const { protect, owner } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createBooking)
  .get(protect, getUserBookings);

router.route('/owner/earnings')
  .get(protect, owner, getOwnerEarnings);

router.route('/station/:stationId')
  .get(protect, owner, getStationBookings);

router.route('/station/:stationId/slots')
  .get(getAvailableSlots);

router.route('/:id/status')
  .put(protect, owner, updateBookingStatus);

module.exports = router;
