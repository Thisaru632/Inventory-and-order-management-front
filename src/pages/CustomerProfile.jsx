import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Lock, Shield, CheckCircle, Save, Edit3, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const CustomerProfile = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      };
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
      }

      const res = await axios.put(`${API_BASE_URL}/api/auth/profile/${user.id || user._id}`, payload);
      if (res.data.success) {
        const updated = res.data.user || res.data.data;
        localStorage.setItem('user', JSON.stringify(updated));
        if (onUpdateUser) {
          onUpdateUser(updated);
        }
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
        setFormData(prev => ({ ...prev, password: '' }));
      } else {
        setMessage({ type: 'error', text: res.data.message || 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Server error while updating profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-blue-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'C')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Customer'}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield size={12} /> Customer Account
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Mail size={14} className="text-gray-400" />
              Username: <span className="font-medium text-gray-700">{user?.email}</span>
            </p>
          </div>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
            >
              <Edit3 size={16} /> Edit Profile
            </button>
          ) : (
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: user?.name || '',
                  phone: user?.phone || '',
                  address: user?.address || '',
                  password: ''
                });
                setMessage({ type: '', text: '' });
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} className="text-green-600" /> : <AlertCircle size={18} className="text-red-600" />}
          {message.text}
        </div>
      )}

      {/* Main Profile Details Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
          Account & Delivery Details
        </h2>

        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</span>
              <p className="text-base font-medium text-gray-800 flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                {user?.name || 'Not provided'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email Address (Login Username)</span>
              <p className="text-base font-medium text-gray-800 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                {user?.email}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Phone Number</span>
              <p className="text-base font-medium text-gray-800 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                {user?.phone || <span className="text-gray-400 italic">No phone number added</span>}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Delivery Address</span>
              <p className="text-base font-medium text-gray-800 flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                <span>{user?.address || <span className="text-gray-400 italic">No delivery address added</span>}</span>
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <User size={14} className="text-gray-500" /> Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Mail size={14} className="text-gray-500" /> Email Address (Username)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"
                  title="Email cannot be changed"
                />
                <p className="text-xs text-gray-400 mt-0.5">Used as your username to log in.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-500" /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. +94 77 123 4567"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-gray-500" /> New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to keep existing password"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-500" /> Delivery Address
                </label>
                <textarea
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your street address, town, and postal code for delivery dispatches"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user?.name || '',
                    phone: user?.phone || '',
                    address: user?.address || '',
                    password: ''
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
              >
                <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
