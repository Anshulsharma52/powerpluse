const User = require('../models/User');
const Station = require('../models/Station');
const Booking = require('../models/Booking');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await User.deleteOne({ _id: req.params.id });
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email mobile')
      .populate({
        path: 'station',
        select: 'name location owner',
        populate: { path: 'owner', select: 'name email mobile' }
      });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStations = await Station.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    res.json({
      totalUsers,
      totalStations,
      totalBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingStations = async (req, res) => {
  try {
    const stations = await Station.find({ status: 'pending' }).populate('owner', 'name email');
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }

    station.status = status;
    await station.save();

    // Emit event so landing page stats can update if approved
    if (status === 'approved') {
       const io = req.app.get('io');
       if (io) io.emit('new_station', station);
    }

    res.json(station);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllStations = async (req, res) => {
  try {
    const stations = await Station.find({}).populate('owner', 'name email mobile');
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStationTax = async (req, res) => {
  try {
    const { taxRate } = req.body;
    if (taxRate === undefined || isNaN(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 100) {
      return res.status(400).json({ message: 'Invalid tax rate. Must be between 0 and 100.' });
    }

    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }

    station.taxRate = Number(taxRate);
    await station.save();

    res.json(station);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPlatformEarnings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'completed'] }
    }).populate('station', 'name location taxRate');

    const stations = await Station.find({});

    res.json({
      stations: stations.map(s => ({ _id: s._id, name: s.name, taxRate: s.taxRate })),
      bookings: bookings.map(b => ({
        _id: b._id,
        stationId: b.station?._id,
        stationName: b.station?.name || 'Station Removed',
        date: b.date,
        totalAmount: b.totalAmount,
        taxRate: b.taxRate || b.station?.taxRate || 0,
        taxAmount: b.taxAmount || 0,
        status: b.status,
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllUsers, deleteUser, getAllBookings, getDashboardStats, getPendingStations, updateStationStatus, getAllStations, updateStationTax, getPlatformEarnings };
