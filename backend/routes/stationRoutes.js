const express = require('express');
const router = express.Router();
const { getStations, getStationById, createStation, updateStation, deleteStation, addReview, getReviews, getOwnerStations } = require('../controllers/stationController');
const { protect, admin, owner } = require('../middleware/authMiddleware');

router.route('/')
  .get(getStations)
  .post(protect, owner, createStation);

router.route('/owner')
  .get(protect, owner, getOwnerStations);

router.route('/:id')
  .get(getStationById)
  .put(protect, owner, updateStation)
  .delete(protect, owner, deleteStation);

router.route('/:id/reviews')
  .post(protect, addReview)
  .get(getReviews);

module.exports = router;
