import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Users, MapPin, Activity, Settings, UserMinus, ShieldAlert, CheckCircle, XCircle, Percent, DollarSign, TrendingUp, Lock, Unlock, Ban } from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import api from "../api";

const socket = io('https://powerpluse.onrender.com/');

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalUsers: 0, totalStations: 0, totalBookings: 0 });
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingStations, setPendingStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, bookings, approvals, stations, earnings

  // Admin New States
  const [allStations, setAllStations] = useState([]);
  const [earningsData, setEarningsData] = useState({ stations: [], bookings: [] });
  const [earningsPeriod, setEarningsPeriod] = useState('month'); // day, month, year
  const [selectedStationFilter, setSelectedStationFilter] = useState('all');
  const [earningsLoading, setEarningsLoading] = useState(true);

  // Quick State for tax rate inputs
  const [taxInputs, setTaxInputs] = useState({});

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: statsData } = await api.get('/admin/stats', config);
      setStats(statsData);

      const { data: usersData } = await api.get('/admin/users', config);
      setUsers(usersData);

      const { data: bookingsData } = await api.get('/admin/bookings', config);
      setBookings(bookingsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

      const { data: pendingData } = await api.get('/admin/stations/pending', config);
      setPendingStations(pendingData);

      const { data: stationsData } = await api.get('/admin/stations', config);
      setAllStations(stationsData);

      const { data: earningsResp } = await api.get('/admin/earnings', config);
      setEarningsData(earningsResp);
      setEarningsLoading(false);

      // Pre-populate tax input states
      const initialTaxes = {};
      stationsData.forEach(s => {
        initialTaxes[s._id] = s.taxRate || 0;
      });
      setTaxInputs(initialTaxes);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();

      socket.on('new_booking', () => {
        fetchData();
        toast.info('New booking recorded on platform');
      });
      socket.on('booking_status_updated', () => {
        fetchData();
      });
      socket.on('new_station', () => {
         fetchData();
      });
    }
    return () => {
      socket.off('new_booking');
      socket.off('booking_status_updated');
      socket.off('new_station');
    };
  }, [user]);

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to permanently delete this user?')) {
       try {
         const config = { headers: { Authorization: `Bearer ${user.token}` } };
         await api.delete(`/admin/users/${userId}`, config);
         toast.success('User deleted successfully');
         fetchData();
       } catch (error) {
         toast.error('Failed to delete user');
       }
    }
  };

  const handleStationApproval = async (stationId, status) => {
     try {
       const config = { headers: { Authorization: `Bearer ${user.token}` } };
       await axios.put(`/api/admin/stations/${stationId}/status`, { status }, config);
       toast.success(`Station ${status} successfully`);
       fetchData();
     } catch (error) {
       toast.error('Failed to update station status');
     }
  };

  const handleBlockStation = async (stationId, block) => {
     try {
       const config = { headers: { Authorization: `Bearer ${user.token}` } };
       const status = block ? 'blocked' : 'approved';
       await axios.put(`/api/admin/stations/${stationId}/status`, { status }, config);
       toast.success(block ? 'Station blocked successfully' : 'Station unblocked successfully');
       fetchData();
     } catch (error) {
       toast.error('Failed to update station status');
     }
  };

  const handleTaxUpdate = async (stationId, taxRate) => {
     try {
       const config = { headers: { Authorization: `Bearer ${user.token}` } };
       await axios.put(`/api/admin/stations/${stationId}/tax`, { taxRate: Number(taxRate) }, config);
       toast.success(`Tax rate updated to ${taxRate}%`);
       fetchData();
     } catch (error) {
       toast.error(error.response?.data?.message || 'Failed to update tax rate');
     }
  };

  if (!user || user.role !== 'admin') return <Navigate to="/login" />;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
       <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Admin Control Center</h1>
              <p className="text-slate-500 font-medium">Platform Management | {user.name}</p>
            </div>
          </div>
          
          <div className="mt-8 flex space-x-8">
            {['overview', 'users', 'bookings', 'approvals', 'stations', 'earnings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold border-b-4 transition-colors capitalize ${activeTab === tab ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                {tab} {tab === 'approvals' && pendingStations.length > 0 && <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{pendingStations.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
            <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-xl"><Users className="text-purple-600 w-6 h-6"/></div>
                <h3 className="text-slate-500 font-bold">Total Platform Users</h3>
              </div>
              <p className="text-4xl font-black text-slate-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-50 rounded-xl"><MapPin className="text-amber-600 w-6 h-6"/></div>
                <h3 className="text-slate-500 font-bold">Total Stations</h3>
              </div>
              <p className="text-4xl font-black text-slate-900">{stats.totalStations}</p>
            </div>
            <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl"><Activity className="text-emerald-600 w-6 h-6"/></div>
                <h3 className="text-slate-500 font-bold">Total Bookings</h3>
              </div>
              <p className="text-4xl font-black text-slate-900">{stats.totalBookings}</p>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-100 animate-fade-in-up">
             <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Manage Users</h3>
            </div>
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email & Mobile</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{u.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{u.email}</div>
                          <div className="text-sm text-slate-500">{u.mobile}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800' : u.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           {u.role !== 'admin' && (
                             <button onClick={() => deleteUser(u._id)} className="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg flex items-center justify-end ml-auto">
                               <UserMinus className="w-4 h-4 mr-1"/> Ban User
                             </button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-100 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Platform Bookings</h3>
            </div>
            <div className="p-0">
               {loading ? (
                <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mx-auto"></div></div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-20 text-slate-500 font-medium">
                  No bookings on the platform.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bookings.map((booking) => (
                    <li key={booking._id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">Booking at {booking.station?.name}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                            <p className="text-sm text-slate-500 font-medium">User: {booking.user?.name} | {booking.user?.mobile}</p>
                            <p className="text-sm text-slate-500 font-medium">Owner: {booking.station?.owner?.name} | {booking.station?.owner?.mobile}</p>
                          </div>
                          <div className="mt-2 text-sm font-bold text-slate-900">
                            Total: ₹{booking.totalAmount}
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
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-100 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-red-600"/> Pending Station Approvals
              </h3>
            </div>
            <div className="p-0">
               {loading ? (
                <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mx-auto"></div></div>
              ) : pendingStations.length === 0 ? (
                <div className="text-center py-20 text-slate-500 font-medium">
                  No pending stations to review.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pendingStations.map((station) => (
                    <li key={station._id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{station.name}</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">Owner: {station.owner?.name} | {station.owner?.email}</p>
                          <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                             <MapPin className="w-4 h-4"/> {station.location.address}, {station.location.city}
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                           <button onClick={() => handleStationApproval(station._id, 'approved')} className="flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-bold transition-colors">
                             <CheckCircle className="w-4 h-4 mr-2"/> Approve
                           </button>
                           <button onClick={() => handleStationApproval(station._id, 'rejected')} className="flex items-center px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold transition-colors">
                             <XCircle className="w-4 h-4 mr-2"/> Reject
                           </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* STATIONS TAB */}
        {activeTab === 'stations' && (
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-100 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Manage EV Charging Stations</h3>
            </div>
            
            {loading ? (
              <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mx-auto"></div></div>
            ) : allStations.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium">No stations registered on the platform.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Station Details</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Owner Details</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Levy Tax (%)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {allStations.map(station => (
                      <tr key={station._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-900">{station.name}</div>
                          <div className="text-xs text-slate-500">{station.location.address}, {station.location.city}</div>
                          <div className="text-xs font-semibold text-primary-600 mt-1">Pricing: ₹{station.pricePerKwh || 0}/kWh</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{station.owner?.name || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{station.owner?.email || ''}</div>
                          <div className="text-xs text-slate-500">{station.owner?.mobile || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full border ${
                            station.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            station.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-200' :
                            station.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {(station.status || 'pending').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              value={taxInputs[station._id] !== undefined ? taxInputs[station._id] : (station.taxRate || 0)}
                              onChange={e => setTaxInputs({ ...taxInputs, [station._id]: e.target.value })}
                              className="w-16 border-2 border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:border-red-500"
                            />
                            <button 
                              onClick={() => handleTaxUpdate(station._id, taxInputs[station._id] || 0)}
                              className="bg-slate-900 hover:bg-red-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors"
                            >
                              Set
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {station.status === 'approved' && (
                            <button 
                              onClick={() => handleBlockStation(station._id, true)} 
                              className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5"/> Block Station
                            </button>
                          )}
                          {station.status === 'blocked' && (
                            <button 
                              onClick={() => handleBlockStation(station._id, false)} 
                              className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <Unlock className="w-3.5 h-3.5"/> Unblock Station
                            </button>
                          )}
                          {station.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleStationApproval(station._id, 'approved')} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-bold">Approve</button>
                              <button onClick={() => handleStationApproval(station._id, 'rejected')} className="text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded font-bold">Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PLATFORM EARNINGS TAB */}
        {activeTab === 'earnings' && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Controls Card */}
            <div className="bg-white p-6 shadow-sm rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Platform Revenue Control</h3>
                <p className="text-slate-500 font-medium text-sm mt-1">Track system-wide transaction taxes and commissions</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Filter Station</label>
                  <select 
                    value={selectedStationFilter} 
                    onChange={e => setSelectedStationFilter(e.target.value)}
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:border-red-500 outline-none bg-white transition-all text-sm"
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
              const totalPlatformShare = filtered.reduce((acc, curr) => acc + curr.taxAmount, 0);
              const totalOwnerShare = totalGross - totalPlatformShare;

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
                  grouped[key] = { key, gross: 0, tax: 0, owner: 0, dateObj: bDate };
                }
                grouped[key].gross += booking.totalAmount;
                grouped[key].tax += booking.taxAmount;
                grouped[key].owner += (booking.totalAmount - booking.taxAmount);
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
                        <h3 className="text-slate-500 font-bold">Total Platform Gross Volume</h3>
                      </div>
                      <p className="text-4xl font-black text-slate-900 relative z-10">₹{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-all opacity-50"></div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 bg-red-50 rounded-xl"><Percent className="text-red-600 w-6 h-6"/></div>
                        <h3 className="text-slate-500 font-bold">Total Platform Tax Revenue</h3>
                      </div>
                      <p className="text-4xl font-black text-red-600 relative z-10">₹{totalPlatformShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-all opacity-50"></div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 bg-emerald-50 rounded-xl"><TrendingUp className="text-emerald-600 w-6 h-6"/></div>
                        <h3 className="text-slate-500 font-bold">Total Station Owners Share</h3>
                      </div>
                      <p className="text-4xl font-black text-emerald-600 relative z-10">₹{totalOwnerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div className="bg-white shadow-sm rounded-3xl border border-slate-100 p-6">
                    <h4 className="text-lg font-bold text-slate-900 mb-6">Revenue History (Platform Tax vs Gross Volume)</h4>
                    {chartData.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 font-medium">No revenue data found for this period.</div>
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

                              const taxH = (d.tax / maxVal) * 200;
                              const taxY = 230 - taxH;

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
                                  {/* Tax Bar */}
                                  <rect 
                                    x={x + barW / 2} 
                                    y={taxY} 
                                    width={barW / 2 - 2} 
                                    height={Math.max(taxH, 2)} 
                                    fill="#ef4444" 
                                    rx="3" 
                                    className="transition-colors hover:fill-red-600 cursor-pointer"
                                  >
                                    <title>{d.key} - Platform Tax: ₹{d.tax.toFixed(2)}</title>
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
                              <span className="text-slate-600">Gross Booking Volume</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded"></div>
                              <span className="text-slate-600">Platform Tax Levy</span>
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

      </div>
    </div>
  );
};

export default AdminDashboard;
