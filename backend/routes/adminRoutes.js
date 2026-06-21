const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  deleteUser, 
  getAllBookings, 
  getDashboardStats, 
  getPendingStations, 
  updateStationStatus,
  getAllStations,
  updateStationTax,
  getPlatformEarnings
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/users')
  .get(protect, admin, getAllUsers);

router.route('/users/:id')
  .delete(protect, admin, deleteUser);

router.route('/bookings')
  .get(protect, admin, getAllBookings);

router.route('/stats')
  .get(protect, admin, getDashboardStats);

router.route('/stations')
  .get(protect, admin, getAllStations);

router.route('/stations/pending')
  .get(protect, admin, getPendingStations);

router.route('/stations/:id/status')
  .put(protect, admin, updateStationStatus);

router.route('/stations/:id/tax')
  .put(protect, admin, updateStationTax);

router.route('/earnings')
  .get(protect, admin, getPlatformEarnings);

module.exports = router;
