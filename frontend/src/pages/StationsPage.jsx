import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { MapPin, BatteryCharging, Star, Zap, Locate } from 'lucide-react';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A custom blue icon for the user/searched location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to dynamically fit map bounds to all stations and search location
const MapBounds = ({ stations, searchLocation }) => {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (searchLocation) {
      points.push([searchLocation.lat, searchLocation.lng]);
    }
    stations.forEach(s => {
      if (s.location?.latitude && s.location?.longitude) {
        points.push([s.location.latitude, s.location.longitude]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [stations, searchLocation, map]);
  return null;
};

const StationsPage = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', chargerType: '' });
  const [activeStations, setActiveStations] = useState([]); // Filtered stations for the map
  const [currentCoords, setCurrentCoords] = useState(null); // { lat, lng }
  const [searchLocation, setSearchLocation] = useState(null); // { lat, lng, label }

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 800);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      try {
        let lat, lng;
        
        // Geocode if city is entered
        if (debouncedFilters.city) {
          if (debouncedFilters.city === 'My Current Location' && currentCoords) {
            lat = currentCoords.lat;
            lng = currentCoords.lng;
          } else {
            try {
              const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedFilters.city)}&limit=1`);
              if (geoRes.data && geoRes.data.length > 0) {
                lat = parseFloat(geoRes.data[0].lat);
                lng = parseFloat(geoRes.data[0].lon);
              }
            } catch (e) {
              console.error("Geocoding failed", e);
            }
          }
        }
        
        const params = { chargerType: debouncedFilters.chargerType };
        if (lat && lng) {
          params.lat = lat;
          params.lng = lng;
          setSearchLocation({ lat, lng, label: debouncedFilters.city });
        } else {
          setSearchLocation(null);
          if (debouncedFilters.city) {
            params.city = debouncedFilters.city;
          }
        }

        const { data } = await api.get('/stations', { params });
        setStations(data);
        setActiveStations(data);
      } catch (error) {
        toast.error('Failed to load charging stations');
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [debouncedFilters, currentCoords]);

  const handleFilterChange = (e) => {
    if (e.target.name === 'city') {
      setCurrentCoords(null);
    }
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.info("Fetching your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentCoords(coords);
        setFilters(prev => ({ ...prev, city: 'My Current Location' }));
        toast.success("Location retrieved!");
      },
      (error) => {
        toast.error("Failed to get location: " + error.message);
      }
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Premium Header */}
      <div className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">Next Charge</span></h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto font-medium">
            Locate premium EV charging stations near you. Filter by location and charger compatibility.
          </p>

          {/* Search/Filter Bar */}
          <div className="mt-10 max-w-4xl mx-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-3">
             <div className="flex-1 relative flex items-center bg-white rounded-xl">
                <MapPin className="absolute left-4 text-slate-400 w-5 h-5"/>
                <input
                  type="text"
                  name="city"
                  placeholder="Search location, city, or PIN code..."
                  value={filters.city}
                  onChange={handleFilterChange}
                  className="w-full text-slate-900 pl-12 pr-12 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/30 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="absolute right-3 p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Use Current Location"
                >
                  <Locate className="w-5 h-5" />
                </button>
             </div>
             <div className="flex-1 relative">
                <BatteryCharging className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                <select
                  name="chargerType"
                  value={filters.chargerType}
                  onChange={handleFilterChange}
                  className="w-full bg-white text-slate-900 rounded-xl pl-12 pr-4 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/30 appearance-none"
                >
                  <option value="">Any Charger Type</option>
                  <option value="Level 1">Level 1 (Slow)</option>
                  <option value="Level 2">Level 2 (Fast)</option>
                  <option value="DC Fast">DC Fast (Ultra)</option>
                </select>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
         {/* Map View */}
         <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-12 h-96">
            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapBounds stations={activeStations} searchLocation={searchLocation} />
              
              {searchLocation && (
                <Marker position={[searchLocation.lat, searchLocation.lng]} icon={userIcon}>
                  <Popup>
                    <div className="p-3">
                      <strong className="text-slate-900 text-base">{searchLocation.label === 'My Current Location' ? 'Your Location' : searchLocation.label}</strong>
                    </div>
                  </Popup>
                </Marker>
              )}

              {activeStations.map((s) => s.location.latitude && s.location.longitude && (
                  <Marker key={s._id} position={[s.location.latitude, s.location.longitude]}>
                    <Popup className="rounded-xl overflow-hidden shadow-none border-none p-0">
                      <div className="p-3">
                        <strong className="text-slate-900 text-lg">{s.name}</strong><br />
                        <span className="text-slate-500 text-sm">{s.location.address}</span><br/>
                        <div className="mt-2 font-bold text-primary-600">₹{s.pricePerKwh}/kWh</div>
                        <Link to={`/stations/${s._id}`} className="mt-2 block w-full bg-slate-900 text-white text-center rounded-lg py-1.5 text-xs font-bold hover:bg-primary-600">Book Now</Link>
                      </div>
                    </Popup>
                  </Marker>
              ))}
            </MapContainer>
         </div>

        {/* Station Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-slate-300 w-10 h-10"/>
             </div>
            <h3 className="text-xl font-bold text-slate-900">No stations found</h3>
            <p className="text-slate-500 font-medium mt-2">Try adjusting your filters or search for a different city.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {stations.map((station) => (
              <div key={station._id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  {station.photos && station.photos.length > 0 ? (
                    <img 
                      src={station.photos[0]} 
                      alt={station.name} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                      <Zap className="w-16 h-16 text-slate-400 opacity-50" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center">
                     <span className={`w-2 h-2 rounded-full mr-2 ${station.availableSlots > 0 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
                     {station.availableSlots > 0 ? `${station.availableSlots} Available` : 'Full'}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-1">{station.name}</h3>
                      <p className="text-sm text-slate-500 font-medium flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                        {station.location.city}, {station.location.state}
                      </p>
                    </div>
                    <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="font-bold text-yellow-700 text-sm">{station.rating ? station.rating.toFixed(1) : 'New'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {station.chargerTypes.map((type) => (
                      <span key={type} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                        {type}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Price</p>
                      <p className="text-xl font-black text-slate-900">₹{station.pricePerKwh}<span className="text-sm font-medium text-slate-500">/kWh</span></p>
                    </div>
                    <Link
                      to={`/stations/${station._id}`}
                      className="bg-slate-900 hover:bg-primary-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-primary-500/20 transition-all hover:-translate-y-0.5"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StationsPage;
