const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'blocked'],
    default: 'pending'
  },
  taxRate: {
    type: Number,
    default: 0
  },
  photos: [{
    type: String
  }],
  name: {
    type: String,
    required: true,
  },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  chargerTypes: [{
    type: String,
    enum: ['Level 1', 'Level 2', 'DC Fast'],
  }],
  pricePerKwh: {
    type: Number,
  },
  pricing: {
    'Level 1': { type: Number, default: 0 },
    'Level 2': { type: Number, default: 0 },
    'DC Fast': { type: Number, default: 0 },
  },
  totalSlots: {
    type: Number,
    required: true,
  },
  availableSlots: {
    type: Number,
    required: true,
  },
  amenities: [{
    type: String,
  }],
  operationalHours: {
    openTime: { type: String, default: '00:00' }, // HH:mm format
    closeTime: { type: String, default: '23:59' }, // HH:mm format
  },
  slotDuration: {
    type: Number,
    default: 60, // in minutes
  },
  acceptsOnlinePayments: {
    type: Boolean,
    default: false,
  },
  upiId: {
    type: String,
  },
  rating: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Station', stationSchema);
