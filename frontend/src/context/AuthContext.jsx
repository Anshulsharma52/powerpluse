import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password, role) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await api.post('/auth/login', { identifier, password, role }, config);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Logged in successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, mobile, password, role) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await api.post('/auth/register', { name, email, mobile, password, role }, config);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    toast.info('Logged out successfully');
  };

  const updateProfile = async (formData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await api.put('/auth/profile', formData, config);
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
