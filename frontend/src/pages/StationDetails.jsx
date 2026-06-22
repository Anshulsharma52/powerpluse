import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, BatteryCharging, Star, Clock, Info, CreditCard, Navigation } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import api from "../api";
// Ensure default icons work correctly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import io from 'socket.io-client';

const socket = io('https://powerpluse.onrender.com/');

// Routing Component
const RoutingMachine = ({ userLocation, stationLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!userLocation || !stationLocation) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(stationLocation.lat, stationLocation.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 6 }]
      }
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map, userLocation, stationLocation]);

  return null;
};


const StationDetails = () => {
  const { id } = useParams();
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Booking State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('station');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedChargerType, setSelectedChargerType] = useState('');
  const [requiredKwh, setRequiredKwh] = useState(30);

  // Map & Navigation State
  const [userLocation, setUserLocation] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  const handleGetDirections = () => {
    if (!station?.location?.latitude || !station?.location?.longitude) {
      toast.error("Station location is not available on the map.");
      return;
    }
    
    setRoutingLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setRoutingLoading(false);
      },
      (error) => {
        toast.error("Could not get your location. Please enable location services.");
        setRoutingLoading(false);
      }
    );
  };

  const fetchStation = async () => {
    try {
      const { data } = await api.get(`/stations/${id}`);
      setStation(data);
      if (data.acceptsOnlinePayments) {
        setPaymentMethod('online');
      }
      if (data.chargerTypes && data.chargerTypes.length > 0) {
        setSelectedChargerType(data.chargerTypes[0]);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load station details');
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    if (!date) return;
    try {
      const { data } = await api.get(`/bookings/station/${id}/slots?date=${date}`);
      setSlots(data);
      setSelectedSlot(null);
    } catch (error) {
      toast.error('Failed to load available slots');
    }
  };

  useEffect(() => {
    fetchStation();

    socket.on('new_booking', (booking) => {
       if (booking.station === id) {
           fetchSlots(); // Refresh slots instantly when someone else books
       }
    });

    return () => {
      socket.off('new_booking');
    };
  }, [id]);

  useEffect(() => {
    fetchSlots();
  }, [date, id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('Please login as an EV Driver to book a slot');
      navigate('/login');
      return;
    }

    if (!date || !selectedSlot) {
      toast.error('Please select a date and time slot');
      return;
    }

    try {
      setBookingLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const currentPrice = station?.pricing?.[selectedChargerType] || station?.pricePerKwh || 0;
      const amount = currentPrice * Number(requiredKwh);

      await api.post('/bookings', {
        station: station._id,
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        totalAmount: amount,
        paymentMethod,
        chargerType: selectedChargerType,
        requiredKwh: Number(requiredKwh)
      }, config);

      toast.success('Slot booked successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)] bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  if (!station) {
    return <div className="text-center mt-20 text-2xl font-bold text-slate-600">Station not found</div>;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-100">
          
          <div className="px-8 py-8 sm:flex justify-between items-start bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black">{station.name}</h3>
              <p className="mt-3 text-lg text-slate-300 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary-400" />
                {station.location.address}, {station.location.city}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end relative z-10">
               <div className="flex items-center bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mr-2" />
                <span className="font-bold text-yellow-400 text-lg">{station.rating ? station.rating.toFixed(1) : 'New'}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400 font-medium">{station.numReviews} Reviews</p>
            </div>
          </div>
          
          <div className="p-8">


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Charger Capabilities</h4>
                <div className="flex flex-wrap gap-3">
                  {station.chargerTypes.map((type) => (
                    <span key={type} className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-white text-slate-700 shadow-sm border border-slate-200">
                      <BatteryCharging className="w-4 h-4 mr-2 text-primary-500" />
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Station Details</h4>
                 <div className="space-y-3 text-slate-700 font-medium">
                   <p className="flex items-center"><Clock className="w-5 h-5 mr-3 text-slate-400"/> Hours: {station.operationalHours?.openTime || '00:00'} to {station.operationalHours?.closeTime || '23:59'}</p>
                   <p className="flex items-center"><Info className="w-5 h-5 mr-3 text-slate-400"/> Price: {station.pricing ? Object.entries(station.pricing).filter(([k,v]) => station.chargerTypes.includes(k)).map(([k,v]) => `${k}: ₹${v}`).join(', ') : `₹${station.pricePerKwh}/kWh`}</p>
                 </div>
              </div>
            </div>

            {/* Map and Routing */}
            {station.location?.latitude && station.location?.longitude && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden mb-10">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-bold text-slate-900">Location & Navigation</h3>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                      onClick={handleGetDirections}
                      disabled={routingLoading}
                      className="flex-1 sm:flex-none flex items-center justify-center bg-primary-100 text-primary-700 hover:bg-primary-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                      {routingLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-700 mr-2"></div>
                      ) : (
                        <Navigation className="w-4 h-4 mr-2" />
                      )}
                      In-App Route
                    </button>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${station.location.latitude},${station.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Google Maps
                    </a>
                  </div>
                </div>
                <div className="h-96 w-full z-0 relative">
                  <MapContainer 
                    center={[station.location.latitude, station.location.longitude]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {!userLocation && (
                       <Marker position={[station.location.latitude, station.location.longitude]}>
                         <Popup>{station.name}</Popup>
                       </Marker>
                    )}
                    {userLocation && (
                       <RoutingMachine 
                         userLocation={userLocation} 
                         stationLocation={{ lat: station.location.latitude, lng: station.location.longitude }} 
                       />
                    )}
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Slot Booking Engine */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Reserve a Time Slot</h3>
              </div>
              <div className="p-6">
                <div className="mb-8">
                  <label htmlFor="date" className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                  <input
                    type="date"
                    id="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full sm:w-64 border-2 border-slate-200 text-slate-900 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 font-medium p-3 transition-all outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Select Charger Type</label>
                  <div className="flex flex-wrap gap-4">
                    {station.chargerTypes.map((type) => {
                      const typePrice = station.pricing?.[type] || station.pricePerKwh || 0;
                      return (
                        <label 
                          key={type} 
                          className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all flex-1 min-w-[200px] ${
                            selectedChargerType === type 
                              ? 'border-primary-500 bg-primary-50/50 shadow-md shadow-primary-500/10' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="chargerType" 
                            value={type} 
                            checked={selectedChargerType === type} 
                            onChange={() => setSelectedChargerType(type)} 
                            className="mr-3 w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{type}</span>
                            <span className="text-sm font-bold text-primary-600">₹{typePrice}/kWh</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <label htmlFor="requiredKwh" className="block text-sm font-bold text-slate-700 mb-2">Required Battery Charge (kWh)</label>
                  <div className="flex items-center max-w-xs border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/20 transition-all bg-white">
                    <input
                      type="number"
                      id="requiredKwh"
                      min="1"
                      max="150"
                      className="w-full font-medium p-3 outline-none text-slate-900 bg-transparent"
                      value={requiredKwh}
                      onChange={(e) => setRequiredKwh(e.target.value)}
                    />
                    <span className="px-4 font-bold text-slate-400 bg-slate-50 border-l border-slate-200 h-full flex items-center">kWh</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 font-medium">Estimate how much energy your vehicle needs to charge.</p>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-700 mb-4">Available Slots ({station.slotDuration || 60} mins each)</label>
                  {slots.length === 0 ? (
                    <p className="text-slate-500 font-medium italic">No slots available for this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {slots.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            !slot.isAvailable ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed line-through' :
                            selectedSlot?.startTime === slot.startTime ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30' :
                            'bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:text-primary-600'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleBooking}>
                  {station.acceptsOnlinePayments && (
                    <div className="mb-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-blue-600"/> Payment Method
                      </label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-blue-500 bg-white shadow-sm' : 'border-slate-200 bg-white/50 opacity-70'}`}>
                          <input type="radio" name="payment" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="font-bold text-slate-700">Online (UPI/Card)</span>
                        </label>
                        <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'station' ? 'border-blue-500 bg-white shadow-sm' : 'border-slate-200 bg-white/50 opacity-70'}`}>
                          <input type="radio" name="payment" value="station" checked={paymentMethod === 'station'} onChange={() => setPaymentMethod('station')} className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="font-bold text-slate-700">Pay at Station</span>
                        </label>
                      </div>
                      {paymentMethod === 'online' && station.upiId && (
                         <p className="mt-3 text-sm text-slate-500 font-medium">Payment will be routed to station UPI: <span className="text-slate-900 font-bold">{station.upiId}</span></p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between mt-8 border-t border-slate-100 pt-8">
                    <div className="mb-4 sm:mb-0">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Amount</p>
                      <p className="text-3xl font-black text-slate-900">
                        ₹{selectedSlot ? ((station?.pricing?.[selectedChargerType] || station?.pricePerKwh || 0) * Number(requiredKwh || 0)).toFixed(2) : '0.00'}
                      </p>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={bookingLoading || !selectedSlot}
                      className={`w-full sm:w-auto flex justify-center items-center py-4 px-10 rounded-2xl text-lg font-bold text-white transition-all ${
                        bookingLoading || !selectedSlot ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-primary-600 shadow-xl shadow-slate-900/10 hover:shadow-primary-500/30 hover:-translate-y-0.5'
                      }`}
                    >
                      {bookingLoading ? 'Processing...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetails;
