import React, { useState, useEffect } from 'react';
import { Building, Plus, Edit2, Trash2, MapPin, X } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import { isSuperAdmin, getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const WarehouseManagement = () => {
  const isSuper = isSuperAdmin();
  const assignedWarehouse = getAssignedWarehouse();
  const [warehouses, setWarehouses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '',
    status: 'Active',
    image: ''
  });

  const fetchWarehouses = async () => {
    try {
      const res = await inventoryService.getStores();
      if (res.success) {
        setWarehouses(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpenModal = (warehouse = null) => {
    if (!isSuper) {
      alert('Only Super Admin is authorized to add or edit warehouses.');
      return;
    }
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        location: warehouse.address || '',
        capacity: warehouse.capacity || '',
        status: warehouse.isActive ? 'Active' : 'Closed',
        code: warehouse.code,
        image: warehouse.image || ''
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: '', location: '', capacity: '', status: 'Active', image: '' });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        code: formData.code || formData.name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4),
        address: formData.location,
        capacity: formData.capacity,
        image: formData.image || '',
        isActive: formData.status === 'Active'
      };

      if (editingWarehouse) {
        await inventoryService.updateStore(editingWarehouse._id, payload);
      } else {
        await inventoryService.createStore(payload);
      }
      fetchWarehouses();
      handleCloseModal();
    } catch (error) {
      alert('Failed to save warehouse');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await inventoryService.deleteStore(id);
        fetchWarehouses();
      } catch (error) {
        alert('Failed to delete warehouse');
      }
    }
  };

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-2">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building className="text-blue-600" /> Warehouse Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage physical store locations and capacities</p>
        </div>
        {isSuper ? (
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium flex items-center gap-2"
          >
            <Plus size={18} /> Add Warehouse
          </button>
        ) : (
          <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-200 font-medium">
            Assigned: {assignedWarehouse || 'All Warehouses'}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Image</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Warehouse Name</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Location</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Capacity</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Status</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warehouses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No warehouses found.
                  </td>
                </tr>
              ) : (
                warehouses
                  .filter(w => !assignedWarehouse || matchesWarehouse(w.name, assignedWarehouse))
                  .map((warehouse) => (
                  <tr key={warehouse._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-2 py-1 text-sm">
                      {warehouse.image ? (
                        <img 
                          src={warehouse.image} 
                          alt={warehouse.name} 
                          className="w-10 h-10 rounded-md object-cover border border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                          <Building size={18} />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1 text-xs font-medium text-gray-900">{warehouse.name}</td>
                    <td className="px-2 py-1 text-sm text-gray-600 flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400" />
                      {warehouse.address}
                    </td>
                    <td className="px-2 py-1 text-sm text-gray-600">{warehouse.capacity}</td>
                    <td className="px-2 py-1 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                        ${warehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-sm text-right">
                      {isSuper ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(warehouse)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(warehouse._id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">View Only</span>
                      )}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden scale-[0.85] origin-center">
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-3 space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Warehouse Name *</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. North Wing Storage"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Location *</label>
                <input 
                  type="text" 
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Address or area code"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Capacity</label>
                <input 
                  type="text" 
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5,000 sq ft or 1000 pallets"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Warehouse Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {formData.image && (
                  <div className="mt-2 relative inline-block">
                    <img 
                      src={formData.image} 
                      alt="Warehouse Preview" 
                      className="h-16 w-24 object-cover rounded border border-gray-200 shadow-sm" 
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700 transition"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
                >
                  {editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;
