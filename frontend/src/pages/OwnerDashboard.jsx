import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { PlusCircle, MapPin, BatteryCharging, Shield, Activity, Calendar, X, CreditCard, Clock, Navigation2, Edit, Image as ImageIcon, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from "../api";

const socket = io('https://powerpluse.onrender.com/');

// Fix for default Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STOCK_EV_PHOTOS = [
  'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1620882772591-6c17f22e861d?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1529341774391-76813cb9d6bd?w=600&auto=format&fit=crop&q=60',
];

const LocationPicker = ({ position, onLocationSelect }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 13);
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const OwnerDashboard = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [stations, setStations] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    pricePerKwh: '',
    pricing: {
      'Level 1': '',
      'Level 2': '',
      'DC Fast': ''
    },
    totalSlots: '',
    chargerTypes: [],
    amenities: [],
    openTime: '00:00',
    closeTime: '23:59',
    slotDuration: '60',
    acceptsOnlinePayments: false,
    upiId: ''
  });
  const [mapPosition, setMapPosition] = useState(null); // {lat, lng}
  const [editingStationId, setEditingStationId] = useState(null);

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      pricePerKwh: '',
      pricing: {
        'Level 1': '',
        'Level 2': '',
        'DC Fast': ''
      },
      totalSlots: '',
      chargerTypes: [],
      amenities: [],
      openTime: '00:00',
      closeTime: '23:59',
      slotDuration: '60',
      acceptsOnlinePayments: false,
      upiId: ''
    });
    setMapPosition(null);
    setEditingStationId(null);
  };

  const handleEditStationClick = (station) => {
    setEditingStationId(station._id);
    setFormData({
      name: station.name || '',
      address: station.location?.address || '',
      city: station.location?.city || '',
      state: station.location?.state || '',
      zipCode: station.location?.zipCode || '',
      pricePerKwh: station.pricePerKwh || '',
      pricing: {
        'Level 1': station.pricing?.['Level 1'] || '',
        'Level 2': station.pricing?.['Level 2'] || '',
        'DC Fast': station.pricing?.['DC Fast'] || ''
      },
      totalSlots: station.totalSlots || '',
      chargerTypes: station.chargerTypes || [],
      amenities: station.amenities || [],
      openTime: station.operationalHours?.openTime || '00:00',
      closeTime: station.operationalHours?.closeTime || '23:59',
      slotDuration: station.slotDuration || '60',
      acceptsOnlinePayments: station.acceptsOnlinePayments || false,
      upiId: station.upiId || ''
    });
    if (station.location?.latitude && station.location?.longitude) {
      setMapPosition({ lat: station.location.latitude, lng: station.location.longitude });
    } else {
      setMapPosition(null);
    }
    setIsModalOpen(true);
  };

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    password: ''
  });

  // Earnings State
  const [earningsData, setEarningsData] = useState({ stations: [], bookings: [] });
  const [earningsPeriod, setEarningsPeriod] = useState('month'); // day, month, year
  const [selectedStationFilter, setSelectedStationFilter] = useState('all');
  const [earningsLoading, setEarningsLoading] = useState(true);

  // Photos State
  const [selectedStationForPhotos, setSelectedStationForPhotos] = useState(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

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
    const cleanForm = { ...profileForm };
    if (!cleanForm.password) delete cleanForm.password;
    const success = await updateProfile(cleanForm);
    if (success) {
      setIsEditingProfile(false);
      setProfileForm(prev => ({ ...prev, password: '' }));
    }
  };

  const fetchStationsAndBookings = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: stationsData } = await api.get('/stations/owner', config);
      setStations(stationsData);

      let bookingsData = [];
      for (const station of stationsData) {
        const { data } = await api.get(`/bookings/station/${station._id}`, config);
        bookingsData = [...bookingsData, ...data];
      }
      setAllBookings(bookingsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data', error);
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.get('/bookings/owner/earnings', config);
      setEarningsData(data);
      setEarningsLoading(false);
    } catch (error) {
      console.error('Failed to fetch earnings', error);
      setEarningsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'owner') {
      fetchStationsAndBookings();
      fetchEarnings();

      socket.on('new_booking', () => {
        fetchStationsAndBookings();
        fetchEarnings();
        toast.info('New booking received!');
      });

      socket.on('booking_status_updated', () => {
        fetchStationsAndBookings();
        fetchEarnings();
      });
    }
    return () => {
      socket.off('new_booking');
      socket.off('booking_status_updated');
    };
  }, [user]);

  const handleAddPhoto = async (url) => {
    const photoToAdd = url || photoUrlInput;
    if (!photoToAdd) {
      toast.error('Please enter a photo URL or select a stock photo');
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const currentPhotos = selectedStationForPhotos.photos || [];
      const updatedPhotos = [...currentPhotos, photoToAdd];

      const { data } = await api.put(`/stations/${selectedStationForPhotos._id}`, { photos: updatedPhotos }, config);
      setSelectedStationForPhotos(data);
      setPhotoUrlInput('');
      toast.success('Photo added successfully!');
      fetchStationsAndBookings();
    } catch (error) {
      toast.error('Failed to add photo');
    }
  };

  const handleRemovePhoto = async (index) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const updatedPhotos = selectedStationForPhotos.photos.filter((_, i) => i !== index);

      const { data } = await api.put(`/stations/${selectedStationForPhotos._id}`, { photos: updatedPhotos }, config);
      setSelectedStationForPhotos(data);
      toast.success('Photo removed successfully!');
      fetchStationsAndBookings();
    } catch (error) {
      toast.error('Failed to remove photo');
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await api.put(`/bookings/${bookingId}/status`, { status }, config);
      toast.success(`Booking marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update booking');
    }
  };

  const deleteStation = async (stationId) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
       try {
         const config = { headers: { Authorization: `Bearer ${user.token}` } };
         await api.delete(`/stations/${stationId}`, config);
         toast.success('Station deleted successfully');
         fetchStationsAndBookings();
       } catch (error) {
         toast.error('Failed to delete station');
       }
    }
  };

  const handleCreateStation = async (e) => {
    e.preventDefault();
    if (!mapPosition) {
       toast.error("Please select a location on the map");
       return;
    }
    if (formData.acceptsOnlinePayments && !formData.upiId) {
        toast.error("Please enter a UPI ID if accepting online payments");
        return;
    }
    
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        name: formData.name,
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          latitude: mapPosition.lat,
          longitude: mapPosition.lng
        },
        chargerTypes: formData.chargerTypes,
        pricePerKwh: Number(formData.pricePerKwh || 0),
        pricing: {
          'Level 1': Number(formData.pricing['Level 1'] || 0),
          'Level 2': Number(formData.pricing['Level 2'] || 0),
          'DC Fast': Number(formData.pricing['DC Fast'] || 0)
        },
        totalSlots: Number(formData.totalSlots),
        availableSlots: Number(formData.totalSlots),
        amenities: formData.amenities,
        operationalHours: {
           openTime: formData.openTime,
           closeTime: formData.closeTime
        },
        slotDuration: Number(formData.slotDuration),
        acceptsOnlinePayments: formData.acceptsOnlinePayments,
        upiId: formData.upiId
      };
      
      if (editingStationId) {
        await api.put(`/stations/${editingStationId}`, payload, config);
        toast.success('Station updated successfully!');
      } else {
        await axios.post('/api/stations', payload, config);
        toast.success('Station created successfully!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchStationsAndBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save station');
    }
  };

  const handleLocationSelect = async (latlng, showSuccess = false) => {
    const lat = latlng.lat;
    const lng = latlng.lng;
    setMapPosition({ lat, lng });
    
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (response.data && response.data.address) {
        const { address } = response.data;
        setFormData(prev => ({
          ...prev,
          address: address.road || address.suburb || address.neighbourhood || address.pedestrian || '',
          city: address.city || address.town || address.village || address.county || '',
          state: address.state || '',
          zipCode: address.postcode || ''
        }));
        if (showSuccess) toast.success("Location found and details auto-filled!");
      } else {
        if (showSuccess) toast.success("Location pinned! Please fill details manually.");
      }
    } catch (error) {
       if (showSuccess) toast.success("Location pinned! Could not auto-fill address.");
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Fetching location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationSelect({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }, true);
        },
        (error) => {
          toast.error("Error getting location: " + error.message);
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };
  const geocodeZipCode = async (zip) => {
    if (!zip || zip.trim().length < 3) return;
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zip)}&limit=1`);
      if (response.data && response.data.length > 0) {
        const { lat, lon, display_name } = response.data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        // Update map position and center
        setMapPosition({ lat: latitude, lng: longitude });
        
        // Try reverse geocoding to fill city & state
        try {
          const revRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (revRes.data && revRes.data.address) {
            const { address } = revRes.data;
            setFormData(prev => ({
              ...prev,
              city: prev.city || address.city || address.town || address.village || address.county || '',
              state: prev.state || address.state || ''
            }));
          }
        } catch (err) {
          console.error("Reverse geocoding after ZIP search failed", err);
        }
        
        toast.success(`Centered map on ZIP/PIN area: ${display_name.split(',')[0]}`);
      }
    } catch (error) {
      console.error("Geocoding PIN code failed", error);
    }
  };
  const toggleChargerType = (type) => {
     setFormData(prev => ({
        ...prev,
        chargerTypes: prev.chargerTypes.includes(type) 
           ? prev.chargerTypes.filter(t => t !== type)
           : [...prev.chargerTypes, type]
     }));
  };

  if (!user || user.role !== 'owner') return <Navigate to="/login" />;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 relative">
       {/* Dashboard Header */}
       <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center text-secondary-600">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Owner Dashboard</h1>
              <p className="text-slate-500 font-medium">Welcome back, {user.name}</p>
            </div>
          </div>
          
          <div className="mt-8 flex space-x-8">
            {['overview', 'stations', 'bookings', 'earnings', 'profile'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold border-b-4 transition-colors capitalize ${activeTab === tab ? 'border-secondary-500 text-secondary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in-up">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary-50 rounded-xl"><MapPin className="text-primary-600 w-6 h-6"/></div>
                  <h3 className="text-slate-500 font-bold">Total Stations</h3>
                </div>
                <p className="text-4xl font-black text-slate-900">{stations.length}</p>
              </div>
              <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl"><Activity className="text-blue-600 w-6 h-6"/></div>
                  <h3 className="text-slate-500 font-bold">Total Bookings</h3>
                </div>
                <p className="text-4xl font-black text-slate-900">{allBookings.length}</p>
              </div>
              <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-50 rounded-xl"><Clock className="text-amber-600 w-6 h-6"/></div>
                  <h3 className="text-slate-500 font-bold">Pending Bookings</h3>
                </div>
                <p className="text-4xl font-black text-amber-600">{allBookings.filter(b => b.status === 'pending').length}</p>
              </div>
              <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-50 rounded-xl"><BatteryCharging className="text-emerald-600 w-6 h-6"/></div>
                  <h3 className="text-slate-500 font-bold">Total Available Slots</h3>
                </div>
                <p className="text-4xl font-black text-slate-900">
                  {stations.reduce((acc, curr) => acc + curr.availableSlots, 0)}
                </p>
              </div>
            </div>

            {/* Map View */}
            <div className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden mb-8">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Your Network Map</h3>
              </div>
              <div className="h-96 w-full z-0 relative">
                 <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {stations.map((s) => s.location.latitude && s.location.longitude && (
                     <Marker key={s._id} position={[s.location.latitude, s.location.longitude]}>
                       <Popup>
                         <strong className="text-slate-900">{s.name}</strong><br />
                         {s.location.city}, {s.location.state}<br/>
                         {s.availableSlots} slots available
                       </Popup>
                     </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* STATIONS TAB */}
        {activeTab === 'stations' && (
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-100 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Manage Stations</h3>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 font-bold flex items-center transition-colors shadow-md">
                <PlusCircle className="w-5 h-5 mr-2" /> Add Station
              </button>
            </div>
            <div className="p-0">
               {stations.length === 0 ? (
                <div className="text-center py-20 text-slate-500 font-medium">You haven't added any stations yet.</div>
               ) : (
                <ul className="divide-y divide-slate-100">
                  {stations.map(station => (
                    <li key={station._id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {station.photos && station.photos.length > 0 ? (
                            <img src={station.photos[0]} alt={station.name} className="w-20 h-20 object-cover rounded-xl border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 border-dashed flex-shrink-0">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                              {station.name}
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                                station.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                station.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-200' :
                                station.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {(station.status || 'pending').toUpperCase()}
                              </span>
                            </h4>
                            <p className="text-sm font-medium text-slate-500 flex items-center mt-2 bg-slate-100 inline-flex px-3 py-1 rounded-lg">
                              <MapPin className="h-4 w-4 mr-1.5 text-secondary-500" /> {station.location.address}, {station.location.city}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-black text-slate-900 text-xl">₹{station.pricePerKwh || 0}<span className="text-sm font-medium text-slate-500">/kWh</span></p>
                          <p className="text-slate-500 font-medium text-sm">{station.availableSlots} / {station.totalSlots} Slots</p>
                          <div className="flex gap-2 items-center mt-2">
                            <button 
                              onClick={() => handleEditStationClick(station)}
                              className="text-primary-600 hover:text-primary-800 text-sm font-bold flex items-center gap-1 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors border border-primary-100"
                            >
                              <Edit className="w-3.5 h-3.5"/> Edit Details
                            </button>
                            <button 
                              onClick={() => { setSelectedStationForPhotos(station); setIsPhotoModalOpen(true); }}
                              className="text-secondary-600 hover:text-secondary-800 text-sm font-bold flex items-center gap-1 bg-secondary-50 hover:bg-secondary-100 px-3 py-1.5 rounded-lg transition-colors border border-secondary-100"
                            >
                              <ImageIcon className="w-3.5 h-3.5"/> Manage Photos ({station.photos?.length || 0})
                            </button>
                            <button onClick={() => deleteStation(station._id)} className="text-red-500 hover:text-red-700 text-sm font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Delete Station</button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-100 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Manage Bookings</h3>
            </div>
            <div className="p-0">
               {allBookings.length === 0 ? (
                <div className="text-center py-20 text-slate-500 font-medium">No bookings received yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {allBookings.map((booking) => (
                    <li key={booking._id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">Booking at {booking.station?.name}</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">User: {booking.user?.name} | {booking.user?.mobile}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600 items-center">
                            <span className="flex items-center"><Calendar className="w-4 h-4 mr-1"/> {new Date(booking.date).toLocaleDateString()}</span>
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {booking.startTime}</span>
                            {booking.chargerType && <span className="font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-lg border border-primary-100">{booking.chargerType}</span>}
                            {booking.requiredKwh && <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100">⚡ {booking.requiredKwh} kWh</span>}
                            <span className="font-bold text-slate-900">₹{booking.totalAmount} ({booking.paymentMethod})</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:items-end gap-3">
                           <span className={`px-4 py-1.5 inline-flex text-xs font-bold rounded-full border ${
                            booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            booking.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {booking.status.toUpperCase()}
                          </span>
                          
                          {booking.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => updateBookingStatus(booking._id, 'confirmed')} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">Confirm</button>
                              <button onClick={() => updateBookingStatus(booking._id, 'cancelled')} className="bg-red-100 text-red-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors">Decline</button>
                            </div>
                          )}
                           {booking.status === 'confirmed' && (
                            <button onClick={() => updateBookingStatus(booking._id, 'completed')} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors">Mark Completed</button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === 'earnings' && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Controls Card */}
            <div className="bg-white p-6 shadow-sm rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Earnings Analytics</h3>
                <p className="text-slate-500 font-medium text-sm mt-1">Track aggregate and station performance</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Filter Station</label>
                  <select 
                    value={selectedStationFilter} 
                    onChange={e => setSelectedStationFilter(e.target.value)}
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:border-secondary-500 outline-none bg-white transition-all text-sm"
                  >
                    <option value="all">All Stations</option>
                    {earningsData.stations.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Time Scale</label>
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {['day', 'month', 'year'].map(p => (
                      <button 
                        key={p} 
                        onClick={() => setEarningsPeriod(p)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${earningsPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            {(() => {
              const filtered = earningsData.bookings.filter(b => 
                selectedStationFilter === 'all' || b.stationId === selectedStationFilter
              );
              
              const totalGross = filtered.reduce((acc, curr) => acc + curr.totalAmount, 0);
              const totalTax = filtered.reduce((acc, curr) => acc + curr.taxAmount, 0);
              const totalNet = filtered.reduce((acc, curr) => acc + curr.netAmount, 0);

              // Prepare SVG Chart data
              const grouped = {};
              filtered.forEach(booking => {
                const bDate = new Date(booking.date);
                let key = '';
                if (earningsPeriod === 'day') {
                  key = bDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                } else if (earningsPeriod === 'month') {
                  key = bDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                } else {
                  key = bDate.getFullYear().toString();
                }

                if (!grouped[key]) {
                  grouped[key] = { key, gross: 0, net: 0, tax: 0, dateObj: bDate };
                }
                grouped[key].gross += booking.totalAmount;
                grouped[key].tax += booking.taxAmount;
                grouped[key].net += booking.netAmount;
              });

              const chartData = Object.values(grouped).sort((a, b) => a.dateObj - b.dateObj);
              const maxVal = Math.max(...chartData.map(d => d.gross), 100);

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-all opacity-50"></div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 bg-slate-50 rounded-xl"><DollarSign className="text-slate-600 w-6 h-6"/></div>
                        <h3 className="text-slate-500 font-bold">Total Gross Earnings</h3>
                      </div>
                      <p className="text-4xl font-black text-slate-900 relative z-10">₹{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-all opacity-50"></div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 bg-amber-50 rounded-xl"><TrendingUp className="text-amber-600 w-6 h-6"/></div>
                        <h3 className="text-slate-500 font-bold">Platform Tax Levy</h3>
                      </div>
                      <p className="text-4xl font-black text-amber-600 relative z-10">₹{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-all opacity-50"></div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 bg-emerald-50 rounded-xl"><Shield className="text-emerald-600 w-6 h-6"/></div>
                        <h3 className="text-slate-500 font-bold">Net Owner Earnings</h3>
                      </div>
                      <p className="text-4xl font-black text-emerald-600 relative z-10">₹{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div className="bg-white shadow-sm rounded-3xl border border-slate-100 p-6">
                    <h4 className="text-lg font-bold text-slate-900 mb-6">Earnings History (Gross vs Net)</h4>
                    {chartData.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 font-medium">No earnings data found for this period.</div>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[600px] h-[320px] relative">
                          <svg className="w-full h-full" viewBox="0 0 800 300">
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                              const y = 30 + (1 - ratio) * 200;
                              return (
                                <g key={i}>
                                  <line x1="60" y1={y} x2="780" y2={y} stroke="#f1f5f9" strokeWidth="1.5" />
                                  <text x="50" y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600">
                                    ₹{Math.round(ratio * maxVal)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Chart Bars */}
                            {chartData.map((d, idx) => {
                              const groupWidth = 720 / chartData.length;
                              const x = 60 + idx * groupWidth + (groupWidth * 0.15);
                              const barW = groupWidth * 0.7;

                              const grossH = (d.gross / maxVal) * 200;
                              const grossY = 230 - grossH;

                              const netH = (d.net / maxVal) * 200;
                              const netY = 230 - netH;

                              return (
                                <g key={idx} className="group">
                                  {/* Gross Bar */}
                                  <rect 
                                    x={x} 
                                    y={grossY} 
                                    width={barW / 2 - 2} 
                                    height={Math.max(grossH, 2)} 
                                    fill="#94a3b8" 
                                    rx="3" 
                                    className="transition-colors hover:fill-slate-500 cursor-pointer"
                                  >
                                    <title>{d.key} - Gross: ₹{d.gross.toFixed(2)}</title>
                                  </rect>
                                  {/* Net Bar */}
                                  <rect 
                                    x={x + barW / 2} 
                                    y={netY} 
                                    width={barW / 2 - 2} 
                                    height={Math.max(netH, 2)} 
                                    fill="#10b981" 
                                    rx="3" 
                                    className="transition-colors hover:fill-emerald-600 cursor-pointer"
                                  >
                                    <title>{d.key} - Net: ₹{d.net.toFixed(2)}</title>
                                  </rect>
                                  {/* X Label */}
                                  <text 
                                    x={x + barW / 2} 
                                    y="255" 
                                    textAnchor="middle" 
                                    fill="#64748b" 
                                    fontSize="10" 
                                    fontWeight="bold"
                                    transform={`rotate(10, ${x + barW / 2}, 255)`}
                                  >
                                    {d.key}
                                  </text>
                                </g>
                              );
                            })}
                            <line x1="60" y1="230" x2="780" y2="230" stroke="#cbd5e1" strokeWidth="2" />
                          </svg>
                          
                          {/* Legend */}
                          <div className="absolute top-0 right-0 flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-slate-400 rounded"></div>
                              <span className="text-slate-600">Gross Earnings</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                              <span className="text-slate-600">Net (Owner Share)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden max-w-2xl animate-fade-in-up">
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
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-secondary-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={profileForm.email} 
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-secondary-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input 
                    type="tel" 
                    required 
                    value={profileForm.mobile} 
                    onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-secondary-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">New Password (leave blank to keep current)</label>
                  <input 
                    type="password" 
                    value={profileForm.password} 
                    onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:border-secondary-500 outline-none transition-all"
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
                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-secondary-600 transition-all shadow-md"
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
                    <div className="mt-1 text-lg font-bold text-secondary-600 capitalize">{user.role}</div>
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
        )}
      </div>

      {/* Add Station Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 border border-slate-100">
             <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
               <h2 className="text-2xl font-black text-slate-900">{editingStationId ? 'Edit Station Details' : 'Add New Station'}</h2>
               <button onClick={() => { resetForm(); setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-700 p-2 bg-white rounded-full shadow-sm"><X className="w-6 h-6"/></button>
             </div>
             <form onSubmit={handleCreateStation} className="p-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Left Column */}
                 <div className="space-y-5">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Station Name</label>
                     <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 focus:ring-4 focus:ring-secondary-500/20 transition-all outline-none" placeholder="e.g. Downtown Fast Charge"/>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Price / kWh (₹)</label>
                       <input type="number" required min="0" step="0.01" value={formData.pricePerKwh} onChange={e => setFormData({...formData, pricePerKwh: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 outline-none"/>
                     </div>
                     <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Total Slots</label>
                       <input type="number" required min="1" value={formData.totalSlots} onChange={e => setFormData({...formData, totalSlots: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 outline-none"/>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Open Time</label>
                       <input type="time" required value={formData.openTime} onChange={e => setFormData({...formData, openTime: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 outline-none"/>
                     </div>
                     <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Close Time</label>
                       <input type="time" required value={formData.closeTime} onChange={e => setFormData({...formData, closeTime: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 outline-none"/>
                     </div>
                   </div>

                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Slot Duration (Mins)</label>
                      <select value={formData.slotDuration} onChange={e => setFormData({...formData, slotDuration: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 outline-none">
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="120">2 Hours</option>
                      </select>
                   </div>

                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Charger Types & Pricing (₹/kWh)</label>
                     <div className="flex flex-col gap-3">
                       {['Level 1', 'Level 2', 'DC Fast'].map(type => (
                         <div key={type} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${formData.chargerTypes.includes(type) ? 'border-secondary-500 bg-secondary-50/50' : 'border-slate-200 bg-white'}`}>
                           <label className="flex items-center cursor-pointer font-bold text-sm text-slate-700 flex-1">
                             <input type="checkbox" className="mr-3 w-4 h-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary-500" checked={formData.chargerTypes.includes(type)} onChange={() => toggleChargerType(type)}/>
                             {type}
                           </label>
                           {formData.chargerTypes.includes(type) && (
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-slate-500">₹</span>
                               <input 
                                 type="number" 
                                 required 
                                 min="0" 
                                 step="0.01" 
                                 placeholder="Price/kWh"
                                 value={formData.pricing[type]} 
                                 onChange={e => setFormData({
                                   ...formData, 
                                   pricing: { ...formData.pricing, [type]: e.target.value },
                                   pricePerKwh: formData.pricePerKwh || e.target.value
                                 })} 
                                 className="w-28 border-2 border-slate-200 rounded-lg px-2 py-1 text-sm font-bold focus:border-secondary-500 outline-none bg-white"
                               />
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>

                 {/* Right Column */}
                 <div className="space-y-5">
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center"><MapPin className="w-4 h-4 mr-1 text-secondary-500"/> Location Details</label>
                      <input type="text" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full mb-3 border-2 border-slate-200 rounded-xl px-4 py-2 font-medium focus:border-secondary-500 outline-none" placeholder="Street Address"/>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <input type="text" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="col-span-1 border-2 border-slate-200 rounded-xl px-4 py-2 font-medium focus:border-secondary-500 outline-none" placeholder="City"/>
                        <input type="text" required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="col-span-1 border-2 border-slate-200 rounded-xl px-4 py-2 font-medium focus:border-secondary-500 outline-none" placeholder="State"/>
                        <input 
                           type="text" 
                           required 
                           value={formData.zipCode} 
                           onChange={e => {
                             const val = e.target.value;
                             setFormData({...formData, zipCode: val});
                             if (/^\d{6}$/.test(val)) {
                               geocodeZipCode(val);
                             }
                           }} 
                           onBlur={e => geocodeZipCode(e.target.value)}
                           className="col-span-1 border-2 border-slate-200 rounded-xl px-4 py-2 font-medium focus:border-secondary-500 outline-none" 
                           placeholder="Zip"
                         />
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Pinpoint on Map</label>
                        <button type="button" onClick={handleCurrentLocation} className="text-xs font-bold text-secondary-600 hover:text-secondary-700 flex items-center bg-secondary-50 px-2 py-1 rounded-md transition-colors">
                          <Navigation2 className="w-3 h-3 mr-1" /> Use Current Location
                        </button>
                      </div>
                      <div className="h-48 w-full rounded-xl overflow-hidden border-2 border-slate-200 relative z-0">
                         <MapContainer center={[20.5937, 78.9629]} zoom={4} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <LocationPicker position={mapPosition} onLocationSelect={handleLocationSelect} />
                        </MapContainer>
                      </div>
                   </div>

                   <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                     <label className="flex items-center cursor-pointer mb-3">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-secondary-600 focus:ring-secondary-500 mr-3" checked={formData.acceptsOnlinePayments} onChange={e => setFormData({...formData, acceptsOnlinePayments: e.target.checked})}/>
                        <span className="font-bold text-slate-900 flex items-center"><CreditCard className="w-4 h-4 mr-2 text-blue-600"/> Accept Online Payments</span>
                     </label>
                     {formData.acceptsOnlinePayments && (
                       <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Station UPI ID</label>
                         <input type="text" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="w-full border-2 border-blue-200 rounded-xl px-4 py-2 font-medium focus:border-blue-500 outline-none" placeholder="e.g. station@bank"/>
                       </div>
                     )}
                   </div>
                 </div>
               </div>

               <div className="mt-8 flex justify-end gap-4 border-t border-slate-100 pt-6">
                 <button type="button" onClick={() => { resetForm(); setIsModalOpen(false); }} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                 <button type="submit" className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-secondary-600 shadow-xl shadow-slate-900/10 hover:-translate-y-0.5 transition-all">{editingStationId ? 'Save Changes' : 'Create Station'}</button>
               </div>
             </form>
           </div>
        </div>
      )}

      {/* Manage Photos Modal */}
      {isPhotoModalOpen && selectedStationForPhotos && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 animate-fade-in">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Manage Station Photos</h2>
                <p className="text-sm text-slate-500 font-medium">{selectedStationForPhotos.name}</p>
              </div>
              <button 
                onClick={() => { setIsPhotoModalOpen(false); setSelectedStationForPhotos(null); }}
                className="text-slate-400 hover:text-slate-700 p-2 bg-white rounded-full shadow-sm"
              >
                <X className="w-6 h-6"/>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Photo Input URL */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Add Photo by URL</label>
                <div className="flex gap-3">
                  <input 
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={photoUrlInput}
                    onChange={e => setPhotoUrlInput(e.target.value)}
                    className="flex-grow border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-secondary-500 outline-none transition-all"
                  />
                  <button 
                    onClick={() => handleAddPhoto()}
                    className="bg-slate-900 text-white hover:bg-secondary-600 px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {/* Preselected stock photos */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Quick Select Stock Photos</label>
                <div className="grid grid-cols-5 gap-3">
                  {STOCK_EV_PHOTOS.map((url, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleAddPhoto(url)}
                      type="button"
                      className="border-2 border-transparent hover:border-secondary-500 rounded-xl overflow-hidden aspect-square transition-all shadow-sm transform hover:scale-105"
                    >
                      <img src={url} alt={`Stock ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Gallery of current photos */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">Current Station Photos ({selectedStationForPhotos.photos?.length || 0})</label>
                {selectedStationForPhotos.photos && selectedStationForPhotos.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    {selectedStationForPhotos.photos.map((photoUrl, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-200 shadow-sm bg-white">
                        <img src={photoUrl} alt="Station" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => handleRemovePhoto(idx)}
                          type="button"
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-2xl">
                    No photos added to this station. Add a URL or select a stock photo above!
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-8 py-5 bg-slate-50/50 rounded-b-3xl border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => { setIsPhotoModalOpen(false); setSelectedStationForPhotos(null); }}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-secondary-600 transition-colors shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
