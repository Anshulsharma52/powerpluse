const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Station = require('../models/Station');
const Booking = require('../models/Booking');

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStations = await Station.countDocuments({ status: 'approved' });
    const totalBookings = await Booking.countDocuments();
    
    // Calculate unique cities from approved stations only
    const cities = await Station.distinct('location.city', { status: 'approved' });
    const totalCities = cities.length;

    res.json({
      totalUsers,
      totalStations,
      totalBookings,
      totalCities,
      uptime: '99.9%'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
