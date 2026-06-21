import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Zap, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('user');
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin-dashboard');
      else if (user.role === 'owner') navigate('/owner-dashboard');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const success = await register(name, email, mobile, password, role);
    if (success) {
      if (role === 'owner') navigate('/owner-dashboard');
      else navigate('/dashboard');
    }
  };

  const getThemeColors = () => {
    switch (role) {
      case 'owner': return { bg: 'bg-secondary-50', text: 'text-secondary-600', border: 'border-secondary-500', btn: 'bg-secondary-600 hover:bg-secondary-700 focus:ring-secondary-500/30 shadow-secondary-500/20' };
      default: return { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-500', btn: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500/30 shadow-primary-500/20' };
    }
  };

  const theme = getThemeColors();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 bg-slate-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-3xl shadow-xl border border-slate-100 transition-all duration-500 relative z-10">
        
        <div className="flex p-1 bg-slate-100/50 rounded-2xl mb-8">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
              role === 'user' 
                ? 'bg-white shadow-sm text-slate-900 scale-105' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Zap className={`w-4 h-4 ${role === 'user' ? theme.text : ''}`} />
            EV Driver
          </button>
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
              role === 'owner' 
                ? 'bg-white shadow-sm text-slate-900 scale-105' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Shield className={`w-4 h-4 ${role === 'owner' ? theme.text : ''}`} />
            Partner
          </button>
        </div>

        <div>
          <div className={`mx-auto h-16 w-16 ${theme.bg} flex items-center justify-center rounded-2xl border ${theme.border} border-opacity-30 transition-colors duration-500`}>
             <UserPlus className={`h-8 w-8 ${theme.text}`} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black text-slate-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">
            {role === 'user' ? 'Join the fast charging network' : 'Start monetizing your EV stations'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="text"
              required
              className={`appearance-none relative block w-full px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border} border`}
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              required
              className={`appearance-none relative block w-full px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border} border`}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="tel"
              required
              className={`appearance-none relative block w-full px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border} border`}
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className={`appearance-none relative block w-full px-4 py-3.5 pr-12 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border} border`}
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
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className={`appearance-none relative block w-full px-4 py-3.5 pr-12 rounded-2xl focus:outline-none focus:ring-4 font-medium sm:text-sm transition-all border-slate-200 text-slate-900 focus:ring-${theme.border.split('-')[1]}-500/20 focus:${theme.border} border`}
                placeholder="Re-enter Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white focus:outline-none focus:ring-4 transition-all shadow-lg hover:-translate-y-0.5 ${theme.btn}`}
            >
              Sign Up
            </button>
          </div>
          
          <div className="text-center text-sm font-medium text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className={`${theme.text} hover:opacity-80 font-bold transition-opacity`}>Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
