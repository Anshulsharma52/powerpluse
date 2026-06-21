import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Shield, Settings, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'owner', 'admin'
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already logged in, redirect to respective dashboard
  if (user) {
    if (user.role === 'admin') navigate('/admin-dashboard');
    else if (user.role === 'owner') navigate('/owner-dashboard');
    else navigate('/dashboard');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(identifier, password, activeTab);
    if (success) {
      if (activeTab === 'admin') navigate('/admin-dashboard');
      else if (activeTab === 'owner') navigate('/owner-dashboard');
      else navigate('/dashboard');
    }
  };

  const tabs = [
    { id: 'user', label: 'EV Driver', icon: Zap, color: 'primary' },
    { id: 'owner', label: 'Partner', icon: Shield, color: 'secondary' },
    { id: 'admin', label: 'Admin', icon: Settings, color: 'red' }
  ];

  const getThemeColors = () => {
    switch (activeTab) {
      case 'owner': return { bg: 'bg-secondary-50', text: 'text-secondary-600', border: 'border-secondary-500', btn: 'bg-secondary-600 hover:bg-secondary-700 focus:ring-secondary-500/30 shadow-secondary-500/20' };
      case 'admin': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-500', btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30 shadow-red-500/20' };
      default: return { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-500', btn: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500/30 shadow-primary-500/20' };
    }
  };

  const theme = getThemeColors();

  return (
    <div className={`min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${activeTab === 'admin' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {activeTab === 'admin' && (
         <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 pointer-events-none"></div>
      )}

      <div className={`max-w-md w-full space-y-8 p-10 rounded-3xl shadow-xl relative z-10 transition-all duration-500 ${activeTab === 'admin' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 border'}`}>
        
        {/* Role Selection Tabs */}
        <div className="flex p-1 bg-slate-100/50 rounded-2xl mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setIdentifier('');
                  setPassword('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-white shadow-sm text-slate-900 scale-105' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? theme.text : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div>
          <div className={`mx-auto h-16 w-16 ${theme.bg} flex items-center justify-center rounded-2xl border ${theme.border} border-opacity-30 transition-colors duration-500`}>
             {activeTab === 'user' && <Zap className="h-8 w-8 text-primary-600" />}
             {activeTab === 'owner' && <Shield className="h-8 w-8 text-secondary-600" />}
             {activeTab === 'admin' && <Settings className="h-8 w-8 text-red-500" />}
          </div>
          <h2 className={`mt-6 text-center text-3xl font-black ${activeTab === 'admin' ? 'text-white' : 'text-slate-900'}`}>
            {activeTab === 'user' ? 'Welcome back' : activeTab === 'owner' ? 'Partner Portal' : 'System Admin'}
          </h2>
          <p className={`mt-2 text-center text-sm font-medium ${activeTab === 'admin' ? 'text-slate-400' : 'text-slate-500'}`}>
            {activeTab === 'user' ? 'Sign in to book your next charge' : activeTab === 'owner' ? 'Manage your EV charging stations' : 'Restricted Access Only'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                required
                className={`appearance-none relative block w-full px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all ${
                  activeTab === 'admin' 
                    ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500' 
                    : `border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border}`
                } border`}
                placeholder={activeTab === 'admin' ? "Admin Email" : "Email or Mobile Number"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className={`appearance-none relative block w-full px-4 py-3.5 pr-12 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all ${
                  activeTab === 'admin' 
                    ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500' 
                    : `border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border}`
                } border`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white focus:outline-none focus:ring-4 transition-all shadow-lg hover:-translate-y-0.5 ${theme.btn}`}
            >
              Sign In
            </button>
          </div>
          
          {activeTab !== 'admin' && (
            <div className="text-center text-sm font-medium text-slate-500 mt-6">
              {activeTab === 'user' ? "Don't have an account? " : "Want to register a station? "}
              <Link to="/signup" className={`${theme.text} hover:opacity-80 font-bold transition-opacity`}>Sign up here</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
