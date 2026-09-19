import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Edit2, Trash2, Shield, User, X, Check } from 'lucide-react';

import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const availablePermissions = [
  { id: 'manage_inventory', label: 'Manage Inventory (Add/Edit/Delete)' },
  { id: 'manage_deliveries', label: 'Manage Deliveries & Orders' },
  { id: 'view_reports', label: 'View Reports' },
  { id: 'view_inventory', label: 'View Inventory Only' }
];

const warehouses = ['All Warehouses', 'Anuradhapura Central', 'Mahiyanganaya Storage', 'Kurunegala Hub'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth`);
        if (response.data.success) {
          // Map MongoDB _id to id, add mock fields if missing (since DB might only have email and password for now)
          const mappedUsers = response.data.data.map(u => ({
            id: u._id,
            name: u.name || u.email.split('@')[0], // Fallback name
            email: u.email,
            role: u.role === 'superadmin' ? 'Super Admin' : (u.role || 'Admin'),
            permissions: u.permissions || ['all'],
            warehouse: 'All Warehouses',
            status: 'Active'
          }));
          setUsers(mappedUsers);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Admin',
    warehouse: 'Anuradhapura Central',
    status: 'Active',
    permissions: []
  });

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        ...user,
        password: '',
        permissions: [...(user.permissions || [])]
      });
    } else {
      setEditingUser(null);
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'Admin', 
        warehouse: 'Anuradhapura Central', 
        status: 'Active', 
        permissions: ['view_inventory'] 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permId) => {
    setFormData(prev => {
      // Super admin always has all permissions conceptually, but in form we let them toggle if they change role
      const hasPerm = prev.permissions.includes(permId);
      let newPerms;
      if (hasPerm) {
        newPerms = prev.permissions.filter(p => p !== permId && p !== 'all');
      } else {
        newPerms = [...prev.permissions.filter(p => p !== 'all'), permId];
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Auto assign 'all' permission if role is Super Admin
    const finalData = { ...formData };
    if (finalData.role === 'Super Admin') {
      finalData.permissions = ['all'];
      finalData.warehouse = 'All Warehouses';
    }

    if (editingUser && (!finalData.password || finalData.password.trim() === '')) {
      delete finalData.password;
    }

    try {
      if (editingUser) {
        const res = await axios.put(`${API_BASE_URL}/api/auth/${editingUser.id}`, finalData);
        if (res.data.success) {
          const u = res.data.data;
          const mapped = {
            id: u._id, name: u.name, email: u.email, role: u.role, permissions: u.permissions, warehouse: u.warehouse, status: u.status
          };
          setUsers(users.map(user => user.id === editingUser.id ? mapped : user));
        }
      } else {
        const res = await axios.post(`${API_BASE_URL}/api/auth`, finalData);
        if (res.data.success) {
          const u = res.data.data;
          const mapped = {
            id: u._id, name: u.name, email: u.email, role: u.role, permissions: u.permissions, warehouse: u.warehouse, status: u.status
          };
          setUsers([...users, mapped]);
        }
      }
      handleCloseModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving user');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const res = await axios.delete(`${API_BASE_URL}/api/auth/${id}`);
        if (res.data.success) {
          setUsers(users.filter(u => u.id !== id));
        }
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting user');
      }
    }
  };

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-2">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserCog className="text-blue-600" /> User Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage system users, access control, and assignments</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium flex items-center gap-2"
        >
          <Plus size={18} /> Add New User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">User Details</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Role</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Warehouse Assignment</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Status</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-2 py-1 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-sm">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'Super Admin' ? (
                          <Shield size={14} className="text-indigo-600" />
                        ) : user.role === 'Admin' ? (
                          <Shield size={14} className="text-blue-600" />
                        ) : (
                          <User size={14} className="text-emerald-600" />
                        )}
                        <span className={`font-medium ${
                          user.role === 'Super Admin' 
                            ? 'text-indigo-600' 
                            : user.role === 'Admin' 
                            ? 'text-blue-600' 
                            : 'text-emerald-700'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-sm text-gray-600 font-medium">
                      {user.warehouse}
                    </td>
                    <td className="px-2 py-1 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                        ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className={`p-1.5 rounded transition ${user.role === 'Super Admin' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                          title={user.role === 'Super Admin' ? "Cannot delete Super Admin" : "Delete User"}
                          disabled={user.role === 'Super Admin'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-2 py-1 text-sm border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-800">
                {editingUser ? 'Edit User & Permissions' : 'Add New User'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-3">
              <form id="userForm" onSubmit={handleSubmit} className="space-y-2">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Full Name *</label>
                    <input 
                      type="text" 
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Nimal Perera"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Email Address *</label>
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="nimal@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    {editingUser ? 'Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input 
                    type="password" 
                    name="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editingUser ? "Leave blank to keep existing password" : "Enter password"}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Role</label>
                    <select 
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-medium text-gray-700">Warehouse Assignment</label>
                    <select 
                      name="warehouse"
                      value={formData.warehouse}
                      onChange={handleInputChange}
                      disabled={formData.role === 'Super Admin'}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      {warehouses.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    {formData.role === 'Super Admin' && (
                      <p className="text-xs text-indigo-600 mt-1">Super Admins automatically have access to All Warehouses.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Account Status</label>
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="Active"
                        checked={formData.status === 'Active'}
                        onChange={handleInputChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="Inactive"
                        checked={formData.status === 'Inactive'}
                        onChange={handleInputChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Inactive</span>
                    </label>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Shield size={16} className="text-indigo-600"/> 
                    Access Permissions
                  </h3>
                  
                  {formData.role === 'Super Admin' ? (
                    <div className="bg-indigo-50 text-indigo-800 p-3 rounded text-sm flex items-center gap-2">
                      <Check size={16} /> Super Admin has full unrestricted access to all modules and features.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availablePermissions.map(perm => {
                        const isChecked = formData.permissions.includes(perm.id) || formData.permissions.includes('all');
                        return (
                          <label key={perm.id} className="flex items-start gap-3 p-3 bg-white rounded border border-gray-100 hover:border-blue-200 cursor-pointer transition shadow-sm">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(perm.id)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-xs font-medium text-gray-700 select-none">
                              {perm.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

              </form>
            </div>
            
            <div className="px-2 py-1 text-sm bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="userForm"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
