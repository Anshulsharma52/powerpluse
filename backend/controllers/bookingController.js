const Station = require('../models/Station');
const Booking = require('../models/Booking');

const createBooking = async (req, res) => {
  try {
    const { station, date, startTime, endTime, totalAmount, paymentMethod, chargerType, requiredKwh } = req.body;

    const now = new Date();
    const bookingDateStr = new Date(date).toISOString().split('T')[0];
    const todayStr = now.toLocaleDateString('en-CA');

    if (bookingDateStr < todayStr) {
      return res.status(400).json({ message: 'Cannot book slots in the past' });
    }

    if (bookingDateStr === todayStr) {
      const currentTimeStr = now.toTimeString().slice(0, 5);
      if (startTime < currentTimeStr) {
        return res.status(400).json({ message: 'Cannot book slots in the past' });
      }
    }

    const dbStation = await Station.findById(station);
    if (!dbStation) {
      return res.status(404).json({ message: 'Station not found' });
    }

    const taxRate = dbStation.taxRate || 0;
    const taxAmount = Number((totalAmount * (taxRate / 100)).toFixed(2));

    const booking = new Booking({
      user: req.user._id,
      station,
      date,
      startTime,
      endTime,
      totalAmount,
      paymentMethod,
      chargerType: chargerType || 'Standard',
      requiredKwh: requiredKwh || 30,
      taxRate,
      taxAmount,
    });

    const createdBooking = await booking.save();
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('new_booking', createdBooking);
    }

    res.status(201).json(createdBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate({
      path: 'station',
      select: 'name location owner pricePerKwh pricing chargerTypes',
      populate: { path: 'owner', select: 'name email mobile' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStationBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ station: req.params.stationId })
      .populate('user', 'name email mobile')
      .populate('station', 'name');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    const updatedBooking = await booking.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('booking_status_updated', updatedBooking);

    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAvailableSlots = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date } = req.query;

    if (!date) return res.status(400).json({ message: 'Date is required' });

    const station = await Station.findById(stationId);
    if (!station) return res.status(404).json({ message: 'Station not found' });

    const bookings = await Booking.find({
      station: stationId,
      date: new Date(date),
      status: { $ne: 'cancelled' }
    });

    const { openTime, closeTime } = station.operationalHours || { openTime: '00:00', closeTime: '23:59' };
    const slotDuration = station.slotDuration || 60;

    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    const slots = [];
    let currentSlotStart = new Date(new Date(date).setHours(openHour, openMin, 0, 0));
    const closeDate = new Date(new Date(date).setHours(closeHour, closeMin, 0, 0));

    const now = new Date();
    const queryDate = new Date(date);
    const isToday = queryDate.toISOString().split('T')[0] === now.toLocaleDateString('en-CA');
    const currentTimeStr = now.toTimeString().slice(0, 5);

    while (currentSlotStart < closeDate) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration * 60000);
      
      const startStr = currentSlotStart.toTimeString().slice(0, 5);
      const endStr = currentSlotEnd.toTimeString().slice(0, 5);

      let isBooked = bookings.some(b => b.startTime === startStr);

      if (isToday && startStr < currentTimeStr) {
        isBooked = true; // mark past slots as unavailable
      }

      slots.push({
        startTime: startStr,
        endTime: endStr,
        isAvailable: !isBooked
      });

      currentSlotStart = currentSlotEnd;
    }

    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOwnerEarnings = async (req, res) => {
  try {
    const ownerStations = await Station.find({ owner: req.user._id });
    const stationIds = ownerStations.map(s => s._id);

    const bookings = await Booking.find({
      station: { $in: stationIds },
      status: { $in: ['confirmed', 'completed'] }
    }).populate('station', 'name location taxRate');

    res.json({
      stations: ownerStations.map(s => ({ _id: s._id, name: s.name, taxRate: s.taxRate })),
      bookings: bookings.map(b => ({
        _id: b._id,
        stationId: b.station?._id,
        stationName: b.station?.name || 'Station Removed',
        date: b.date,
        totalAmount: b.totalAmount,
        taxRate: b.taxRate || b.station?.taxRate || 0,
        taxAmount: b.taxAmount || 0,
        netAmount: b.totalAmount - (b.taxAmount || 0),
        status: b.status,
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBooking, getUserBookings, getStationBookings, updateBookingStatus, getAvailableSlots, getOwnerEarnings };
