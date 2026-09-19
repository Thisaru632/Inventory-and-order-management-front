import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Phone, Mail, MapPin, Calendar, 
  Shield, Edit2, Trash2, Eye, X, CheckCircle2, AlertCircle, 
  RefreshCw, Check, Lock, Package, ShoppingBag, Filter, UserCheck
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import deliveryService from '../services/deliveryService';
import { isSuperAdmin, isAdmin } from '../utils/auth';

const CustomerUserList = () => {
  const isSuper = isSuperAdmin();
  const isUserAdmin = isAdmin();

  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Inactive'
  
  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState(null); // For View Details modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  
  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    status: 'Active'
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const fetchCustomerUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/auth`);
      if (res.data.success && Array.isArray(res.data.data)) {
        const customerList = res.data.data
          .filter(u => (u.role || '').toString().toLowerCase().trim() === 'customer')
          .map(u => ({
            id: u._id || u.id,
            name: u.name || u.email?.split('@')[0] || 'Customer',
            email: u.email,
            phone: u.phone || '',
            address: u.address || '',
            role: 'Customer',
            status: u.status || 'Active',
            createdAt: u.createdAt || null
          }));
        setCustomers(customerList);
      }
    } catch (err) {
      console.error('Failed to fetch customer users:', err);
      showNotification('error', 'Failed to load customer users from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await deliveryService.getDeliveries();
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders for customer stats:', err);
    }
  };

  useEffect(() => {
    fetchCustomerUsers();
    fetchOrders();
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'ALL' || 
        c.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'Active').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [customers]);

  // Handle Add Customer
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      status: 'Active'
    });
    setIsAddModalOpen(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotification('error', 'Email and password are required.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        name: formData.name.trim() || formData.email.split('@')[0],
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        role: 'Customer',
        warehouse: 'All Warehouses',
        status: formData.status,
        permissions: ['customer']
      };

      const res = await axios.post(`${API_BASE_URL}/api/auth`, payload);
      if (res.data.success) {
        showNotification('success', `Customer "${payload.name}" created successfully!`);
        setIsAddModalOpen(false);
        fetchCustomerUsers();
      } else {
        showNotification('error', res.data.message || 'Failed to create customer.');
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Error creating customer user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Customer
  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      email: cust.email,
      phone: cust.phone,
      address: cust.address,
      password: '',
      status: cust.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setActionLoading(true);
      const payload = {
        name: formData.name.trim() || editingCustomer.name,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        status: formData.status,
        role: 'Customer',
        warehouse: 'All Warehouses'
      };
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password.trim();
      }

      const res = await axios.put(`${API_BASE_URL}/api/auth/${editingCustomer.id}`, payload);
      if (res.data.success) {
        showNotification('success', `Customer "${payload.name}" updated successfully!`);
        setIsEditModalOpen(false);
        setEditingCustomer(null);
        fetchCustomerUsers();
        if (selectedCustomer && selectedCustomer.id === editingCustomer.id) {
          setSelectedCustomer(prev => ({ ...prev, ...payload }));
        }
      } else {
        showNotification('error', res.data.message || 'Failed to update customer.');
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Error updating customer user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Status directly
  const handleToggleStatus = async (cust) => {
    const newStatus = cust.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await axios.put(`${API_BASE_URL}/api/auth/${cust.id}`, {
        status: newStatus
      });
      if (res.data.success) {
        setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, status: newStatus } : c));
        showNotification('success', `Customer status set to ${newStatus}.`);
      }
    } catch (err) {
      showNotification('error', 'Failed to update customer status.');
    }
  };

  // Handle Delete Customer
  const handleDeleteCustomer = async () => {
    if (!deleteConfirmUser) return;
    try {
      setActionLoading(true);
      const res = await axios.delete(`${API_BASE_URL}/api/auth/${deleteConfirmUser.id}`);
      if (res.data.success) {
        showNotification('success', `Customer "${deleteConfirmUser.name}" deleted successfully.`);
        setDeleteConfirmUser(null);
        if (selectedCustomer && selectedCustomer.id === deleteConfirmUser.id) {
          setSelectedCustomer(null);
        }
        fetchCustomerUsers();
      } else {
        showNotification('error', res.data.message || 'Failed to delete customer.');
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Error deleting customer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Get customer's orders
  const getCustomerOrders = (cust) => {
    if (!cust) return [];
    return orders.filter(o => {
      const shopMatch = o.customerShopName?.toLowerCase() === cust.name?.toLowerCase();
      const addrMatch = cust.address && o.customerAddress?.toLowerCase().includes(cust.address?.toLowerCase());
      return shopMatch || addrMatch;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Toast Notification */}
      {notification.message && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck size={24} />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Customer User List</h1>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Admin & Super Admin
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Browse, manage, and view customer accounts registered on the customer portal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchCustomerUsers(); fetchOrders(); }}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition border border-gray-200"
            title="Refresh List"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition"
          >
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Customers</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inactive Customers</p>
            <h3 className="text-2xl font-bold text-gray-500 mt-1">{stats.inactive}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center font-bold">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('Active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'Active'
                ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm'
                : 'text-gray-500 hover:text-emerald-700'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setStatusFilter('Inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'Inactive'
                ? 'bg-gray-200 text-gray-800 font-semibold shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Inactive ({stats.inactive})
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Contact Number</th>
                <th className="px-6 py-3.5">Delivery Address</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Registered</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-500" />
                      <span>Loading customer users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-gray-300" />
                      <p className="text-gray-600 font-medium">No customer accounts found</p>
                      <p className="text-xs text-gray-400">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Customers who register via the portal will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const custOrders = getCustomerOrders(cust);
                  return (
                    <tr key={cust.id} className="hover:bg-blue-50/20 transition group">
                      {/* Customer Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                              {cust.name}
                              {custOrders.length > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200" title={`${custOrders.length} order(s)`}>
                                  {custOrders.length} {custOrders.length === 1 ? 'order' : 'orders'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                              <Mail size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Phone size={13} className="text-gray-400" />
                            <span className="font-mono text-xs">{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Not provided</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-6 py-4 max-w-xs">
                        {cust.address ? (
                          <div className="flex items-start gap-1.5 text-gray-700 text-xs line-clamp-2">
                            <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <span>{cust.address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Not provided</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(cust)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                            cust.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cust.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {cust.status}
                        </button>
                      </td>

                      {/* Registered Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {cust.createdAt ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            <span>{new Date(cust.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Full Details"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(cust)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Customer"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmUser(cust)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Customer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: View Details */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Shield size={10} /> Customer Account
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-medium">Username / Email</p>
                  <p className="font-medium text-gray-900 mt-1 break-all flex items-center gap-1.5">
                    <Mail size={14} className="text-blue-500 flex-shrink-0" />
                    {selectedCustomer.email}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-medium">Phone Number</p>
                  <p className="font-medium text-gray-900 mt-1 flex items-center gap-1.5">
                    <Phone size={14} className="text-blue-500 flex-shrink-0" />
                    {selectedCustomer.phone || <span className="text-gray-400 italic">Not provided</span>}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 uppercase font-medium">Delivery Address</p>
                <p className="font-medium text-gray-900 mt-1 flex items-start gap-1.5">
                  <MapPin size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{selectedCustomer.address || <span className="text-gray-400 italic">Not provided</span>}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-medium">Account Status</p>
                  <p className="font-medium mt-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedCustomer.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-medium">Member Since</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {selectedCustomer.createdAt 
                      ? new Date(selectedCustomer.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Related Orders */}
              <div className="pt-2">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <ShoppingBag size={16} className="text-blue-600" />
                  Order Activity ({getCustomerOrders(selectedCustomer).length})
                </h4>
                {getCustomerOrders(selectedCustomer).length === 0 ? (
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl">
                    No orders linked to this customer yet.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {getCustomerOrders(selectedCustomer).map((order, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-gray-800">{order.material?.name || 'Item'}</span>
                          <span className="text-gray-500 ml-1">× {order.quantity} {order.unit}</span>
                          <p className="text-[11px] text-gray-400 mt-0.5">Warehouse: {order.store?.name || 'Main'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const cust = selectedCustomer;
                  setSelectedCustomer(null);
                  handleOpenEditModal(cust);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition"
              >
                Edit Details
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Customer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="text-blue-600" size={20} /> Add New Customer
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email (Username)</label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0712345678"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Delivery Address</label>
                <textarea
                  rows="2"
                  placeholder="Street address, city, etc."
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Customer */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="text-emerald-600" size={20} /> Edit Customer
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email / Username</label>
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full px-3.5 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Delivery Address</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Change Password <span className="text-gray-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center border border-gray-100">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Customer Account?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteConfirmUser.name}</span> ({deleteConfirmUser.email})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium shadow transition disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerUserList;
