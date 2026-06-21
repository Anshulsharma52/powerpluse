import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';

import UserDashboard from './pages/UserDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import StationsPage from './pages/StationsPage';
import StationDetails from './pages/StationDetails';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <Link to="/" className="text-3xl font-black text-slate-900 flex items-center gap-4 group">
            <div className="bg-gradient-to-tr from-primary-500 to-secondary-500 text-white rounded-2xl p-2.5 shadow-xl shadow-primary-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="tracking-tight">PowerPluse</span>
          </Link>
          <nav className="hidden md:flex space-x-8 items-center">
            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">Home</Link>
            <Link to="/stations" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">Find Stations</Link>
            
            {user ? (
              <div className="flex items-center gap-6 border-l border-slate-200 pl-6 ml-2">
                {user.role === 'admin' && <Link to="/admin-dashboard" className="text-sm font-semibold text-slate-600 hover:text-primary-600">Dashboard</Link>}
                {user.role === 'owner' && <Link to="/owner-dashboard" className="text-sm font-semibold text-slate-600 hover:text-primary-600">Dashboard</Link>}
                {user.role === 'user' && <Link to="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-primary-600">Dashboard</Link>}
                
                <button 
                  onClick={logout}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Logout ({user.name})
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 border-l border-slate-200 pl-6 ml-2">
                <Link to="/login" className="text-sm font-bold text-slate-700 hover:text-primary-600 transition-colors">Log in</Link>
                <Link to="/signup" className="bg-slate-900 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all">Sign Up</Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
          <Navigation />

          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/stations" element={<StationsPage />} />
              <Route path="/stations/:id" element={<StationDetails />} />
              <Route path="/owner-dashboard" element={<OwnerDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Routes>
          </main>
          
          <footer className="bg-gray-900 text-gray-400 py-8 text-center">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
              <div className="text-2xl font-bold text-white mb-4 md:mb-0 flex items-center gap-2">
                <span className="bg-primary-600 text-white rounded-full p-1 text-sm">⚡</span>
                PowerPluse
              </div>
              <p>&copy; 2026 PowerPluse. All rights reserved.</p>
            </div>
          </footer>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;
