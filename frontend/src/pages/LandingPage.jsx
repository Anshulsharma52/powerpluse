import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, MapPin, BatteryCharging, ShieldCheck, ChevronRight, CheckCircle2, Activity } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const LandingPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStations: 0,
    totalBookings: 0,
    totalCities: 0,
    uptime: '99.9%'
  });

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/public/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  useEffect(() => {
    fetchStats();

    socket.on('new_booking', fetchStats);
    socket.on('booking_status_updated', fetchStats);

    return () => {
      socket.off('new_booking');
      socket.off('booking_status_updated');
    };
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen font-sans overflow-hidden">
      {/* Hero Section */}
      <div className="relative pt-24 pb-32 lg:pt-36 lg:pb-40">
        {/* Colorful Animated Background Blobs */}
        <div className="absolute top-0 -left-10 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-10 w-96 h-96 bg-secondary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: '4s' }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center px-5 py-2.5 rounded-full glass mb-8 text-primary-700 font-bold text-sm shadow-sm border border-primary-100">
              <span className="flex h-2.5 w-2.5 relative mr-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-600"></span>
              </span>
              The Next-Gen EV Charging Network
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
              Power up your <br className="hidden md:block" />
              <span className="text-gradient">electric journey</span>
            </h1>
            
            <p className="mt-6 text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
              Find the fastest, most reliable EV chargers. Book instantly, skip the lines, and drive with absolute confidence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <Link to="/stations" className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-5 text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-1 transition-all duration-300 group">
                Find Stations
                <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link to="/signup" className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-5 text-lg font-bold rounded-2xl text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-md hover:-translate-y-1 transition-all duration-300">
                Join Network
              </Link>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-6 text-sm font-medium text-slate-500 flex-wrap">
              <span className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl"><CheckCircle2 className="w-5 h-5 text-primary-500 mr-2"/> No subscription required</span>
              <span className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl"><Zap className="w-5 h-5 text-primary-500 mr-2"/> {stats.totalStations} Active Stations</span>
              <span className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl"><BatteryCharging className="w-5 h-5 text-primary-500 mr-2"/> {stats.totalBookings} Successful Charges</span>
              <span className="flex items-center bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl"><MapPin className="w-5 h-5 text-primary-500 mr-2"/> {stats.totalCities} Cities Covered</span>
              <span className="flex items-center bg-emerald-50 text-emerald-700 backdrop-blur-sm px-4 py-2 rounded-xl font-bold"><Activity className="w-5 h-5 text-emerald-500 mr-2"/> {stats.uptime} Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Features Section */}
      <div className="py-24 relative z-10 bg-white rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-primary-600 font-bold tracking-widest uppercase text-sm mb-4">Premium Experience</h2>
            <p className="text-4xl md:text-5xl font-black text-slate-900">
              A better way to charge
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature Cards */}
            {[
              { icon: MapPin, title: 'Real-time Availability', desc: 'See exactly which chargers are available instantly. No more driving to a full station.', color: 'text-secondary-600', bg: 'bg-secondary-50', border: 'border-secondary-100' },
              { icon: Zap, title: 'Advance Booking', desc: 'Reserve your charging slot up to 24 hours in advance and guarantee your charge.', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
              { icon: ShieldCheck, title: 'Secure Payments', desc: 'Pay seamlessly and securely through our platform with highly transparent pricing.', color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
              { icon: BatteryCharging, title: 'All Connector Types', desc: 'Filter by Level 1, Level 2, or DC Fast chargers to find exactly what you need.', color: 'text-accent-600', bg: 'bg-accent-50', border: 'border-accent-100' },
            ].map((feature, idx) => (
              <div key={idx} className={`bg-white rounded-3xl p-8 border ${feature.border} shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group`}>
                <div className={`w-16 h-16 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Call to action */}
      <div className="bg-slate-900 py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
        
        <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to hit the road?</h2>
          <p className="text-xl text-slate-300 mb-10 font-medium">Join thousands of EV drivers who have already switched to a smarter, seamless charging experience.</p>
          <Link to="/signup" className="inline-flex justify-center items-center px-10 py-5 text-lg font-bold rounded-2xl text-slate-900 bg-white hover:bg-slate-50 shadow-xl transition-all duration-300 hover:scale-105">
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
