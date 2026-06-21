const Station = require('../models/Station');
const Review = require('../models/Review');

const getStations = async (req, res) => {
  try {
    const filter = { status: 'approved' };
    if (req.query.chargerType) filter.chargerTypes = req.query.chargerType;

    let stations = await Station.find(filter).populate('owner', 'name email');

    if (req.query.lat && req.query.lng) {
      const targetLat = parseFloat(req.query.lat);
      const targetLng = parseFloat(req.query.lng);
      
      const R = 6371; // Earth's radius in km
      
      stations = stations.map(station => {
        if (!station.location || !station.location.latitude || !station.location.longitude) {
          return { ...station.toObject(), distance: Infinity };
        }
        
        const lat1 = targetLat;
        const lon1 = targetLng;
        const lat2 = station.location.latitude;
        const lon2 = station.location.longitude;
        
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
        const distance = R * c; 
        
        return { ...station.toObject(), distance };
      });

      // Filter by <= 100km and sort by distance
      stations = stations.filter(s => s.distance <= 100).sort((a, b) => a.distance - b.distance);
    } else if (req.query.city) {
      const cityRegex = new RegExp(req.query.city, 'i');
      stations = stations.filter(s => cityRegex.test(s.location.city));
    }

    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStationById = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id).populate('owner', 'name email');
    if (station) {
      res.json(station);
    } else {
      res.status(404).json({ message: 'Station not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createStation = async (req, res) => {
  try {
    const station = new Station({
      ...req.body,
      availableSlots: req.body.totalSlots,
      owner: req.user._id,
    });
    const createdStation = await station.save();
    
    // Emit socket event for real-time landing page update
    const io = req.app.get('io');
    if (io) {
      io.emit('new_station', createdStation);
    }

    res.status(201).json(createdStation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStation = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);

    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }

    if (station.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this station' });
    }

    const updatedStation = await Station.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedStation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStation = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);

    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }

    if (station.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this station' });
    }

    await Station.deleteOne({ _id: req.params.id });
    res.json({ message: 'Station removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const station = await Station.findById(req.params.id);

    if (station) {
      const review = new Review({
        user: req.user._id,
        station: req.params.id,
        rating: Number(rating),
        comment,
      });

      await review.save();

      const reviews = await Review.find({ station: req.params.id });
      station.numReviews = reviews.length;
      station.rating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

      await station.save();
      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Station not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ station: req.params.id }).populate('user', 'name');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOwnerStations = async (req, res) => {
  try {
    const stations = await Station.find({ owner: req.user._id });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStations, getStationById, createStation, updateStation, deleteStation, addReview, getReviews, getOwnerStations };
