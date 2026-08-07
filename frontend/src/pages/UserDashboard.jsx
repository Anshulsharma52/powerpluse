import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Calendar, Clock, User, CheckCircle, XCircle, Navigation, Edit, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import io from 'socket.io-client';
import api from "../api";

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

const UserDashboard = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');

  // Navigation State
  const [selectedBookingForRoute, setSelectedBookingForRoute] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        password: ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const mobileRegex = /^[0-9]{10}$/;
    if (profileForm.mobile && !mobileRegex.test(profileForm.mobile)) {
      toast.error("Mobile number must be exactly 10 digits long");
      return;
    }
    const cleanForm = { ...profileForm };
    if (!cleanForm.password) delete cleanForm.password;
    const success = await updateProfile(cleanForm);
    if (success) {
      setIsEditingProfile(false);
      setProfileForm(prev => ({ ...prev, password: '' }));
    }
  };

  const handleGetDirections = (booking) => {
    if (!booking.station?.location?.latitude || !booking.station?.location?.longitude) {
      toast.error("Station location is not available on the map.");
      return;
    }
    
    setSelectedBookingForRoute(booking);
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

  const fetchBookings = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.get('/bookings', config);
      // Sort by newest first
      setBookings(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchBookings();

      // Real-time listener for booking updates
      socket.on('booking_status_updated', (updatedBooking) => {
        if (updatedBooking.user === user._id) {
          fetchBookings();
          toast.info(`Booking status updated to ${updatedBooking.status}`);
        }
      });
    }
    return () => {
      socket.off('booking_status_updated');
    };
  }, [user]);

  const cancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await api.put(`/bookings/${bookingId}/status`, { status: 'cancelled' }, config);
        toast.success('Booking cancelled successfully');
      } catch (error) {
        toast.error('Failed to cancel booking');
      }
    }
  };

  if (!user || user.role !== 'user') return <Navigate to="/login" />;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Welcome, {user.name}</h1>
              <p className="text-slate-500 font-medium">{user.email} | {user.mobile}</p>
            </div>
          </div>
          
          {/* Internal Navbar Tabs */}
          <div className="mt-8 flex space-x-8">
            <button 
              onClick={() => setActiveTab('bookings')}
              className={`pb-4 text-sm font-bold border-b-4 transition-colors ${activeTab === 'bookings' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              My Bookings
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`pb-4 text-sm font-bold border-b-4 transition-colors ${activeTab === 'profile' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedBookingForRoute && selectedBookingForRoute.station?.location && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden mb-8 animate-fade-in-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Navigation to {selectedBookingForRoute.station.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{selectedBookingForRoute.station.location.address}</p>
              </div>
              <button 
                onClick={() => { setSelectedBookingForRoute(null); setUserLocation(null); }}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
              >
                Close Map
              </button>
            </div>
            <div className="h-96 w-full z-0 relative">
              <MapContainer 
                center={[selectedBookingForRoute.station.location.latitude, selectedBookingForRoute.station.location.longitude]} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {!userLocation && (
                   <Marker position={[selectedBookingForRoute.station.location.latitude, selectedBookingForRoute.station.location.longitude]}>
                     <Popup>{selectedBookingForRoute.station.name}</Popup>
                   </Marker>
                )}
                {userLocation && (
                   <RoutingMachine 
                     userLocation={userLocation} 
                     stationLocation={{ lat: selectedBookingForRoute.station.location.latitude, lng: selectedBookingForRoute.station.location.longitude }} 
                   />
                )}
              </MapContainer>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Recent Charging Sessions</h3>
            </div>
            
            {loading ? (
              <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500 mx-auto"></div></div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium">
                You don't have any recent bookings.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <li key={booking._id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{booking.station?.name || 'Station Removed'}</h4>
                        <p className="text-sm text-slate-500 flex items-center mt-1 font-medium">
                          <MapPin className="h-4 w-4 mr-1 text-primary-400" /> {booking.station?.location?.address || 'N/A'}
                        </p>
                        {booking.station?.owner && (
                          <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wide">
                            Owner: {booking.station.owner.name} | {booking.station.owner.mobile}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className={`px-4 py-1.5 inline-flex text-xs font-bold rounded-full border ${
                          booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          booking.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {booking.status.toUpperCase()}
                        </span>
                        
                        {(booking.status === 'confirmed' || booking.status === 'pending') && booking.station?.location && (
                          <>
                            <button 
                              onClick={() => handleGetDirections(booking)}
                              disabled={routingLoading && selectedBookingForRoute?._id === booking._id}
                              className="bg-primary-100 text-primary-700 hover:bg-primary-200 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center"
                            >
                              {routingLoading && selectedBookingForRoute?._id === booking._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-700 mr-1"></div>
                              ) : (
                                <Navigation className="w-4 h-4 mr-1" />
                              )}
                              Route
                            </button>
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${booking.station.location.latitude},${booking.station.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center"
                            >
                              <MapPin className="w-4 h-4 mr-1" />
                              Maps
                            </a>
                          </>
                        )}

                        {booking.status === 'pending' && (
                          <button 
                            onClick={() => cancelBooking(booking._id)}
                            className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 items-center">
                      <div className="flex items-center font-medium">
                        <Calendar className="flex-shrink-0 mr-2 h-4 w-4 text-primary-500" />
                        {new Date(booking.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center font-medium">
                        <Clock className="flex-shrink-0 mr-2 h-4 w-4 text-primary-500" />
                        {booking.startTime} - {booking.endTime}
                      </div>
                      {booking.chargerType && (
                        <div className="flex items-center font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-lg border border-primary-100">
                          {booking.chargerType}
                        </div>
                      )}
                      {booking.requiredKwh && (
                        <div className="flex items-center font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                          ⚡ {booking.requiredKwh} kWh Requested
                        </div>
                      )}
                      <div className="flex items-center font-bold text-slate-900 ml-auto">
                        Total: ₹{booking.totalAmount}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
            <div className="md:col-span-2 bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden">
               <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Profile Information</h3>
                {!isEditingProfile && (
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Edit className="w-4 h-4"/> Edit Profile
                  </button>
                )}
              </div>
              
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={profileForm.name} 
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={profileForm.email} 
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input 
                      type="tel" 
                      required 
                      value={profileForm.mobile} 
                      onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">New Password (leave blank to keep current)</label>
                    <input 
                      type="password" 
                      value={profileForm.password} 
                      onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingProfile(false)} 
                      className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-primary-600 transition-all shadow-md"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wide">Full Name</label>
                      <div className="mt-1 text-lg font-bold text-slate-900">{user.name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wide">Account Role</label>
                      <div className="mt-1 text-lg font-bold text-primary-600 capitalize">{user.role}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wide">Email Address</label>
                      <div className="mt-1 text-lg font-bold text-slate-900">{user.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-wide">Mobile Number</label>
                      <div className="mt-1 text-lg font-bold text-slate-900">{user.mobile}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-tr from-primary-600 to-secondary-500 shadow-xl rounded-3xl p-8 text-white flex flex-col justify-between border border-primary-500/20">
              <div>
                <div className="bg-white/20 rounded-2xl p-3 w-fit mb-6">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black mb-3">Ready to Charge?</h3>
                <p className="text-white/80 font-medium text-sm leading-relaxed mb-6">
                  Discover nearby high-speed EV charging stations, check real-time availability, and book slots instantly.
                </p>
              </div>
              <Link 
                to="/stations" 
                className="w-full bg-white text-slate-900 hover:bg-slate-50 py-4 px-6 rounded-2xl font-black text-center shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                id="find-station-btn"
              >
                Find Station ⚡
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
