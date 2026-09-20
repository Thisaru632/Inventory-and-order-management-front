import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import inventoryService from '../services/inventoryService';

const AddMaterialModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    baseUnit: 'kg',
    minStockAlert: 0
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await inventoryService.createMaterial(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        sku: '',
        category: '',
        baseUnit: 'kg',
        minStockAlert: 0
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden scale-[0.85] origin-center">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <PackagePlus size={20} className="text-emerald-600" />
            Add New Material
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Name *</label>
              <input 
                type="text" 
                name="name"
                placeholder="e.g., Steel Beams"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">SKU (Unique) *</label>
              <input 
                type="text" 
                name="sku"
                placeholder="e.g., STL-BM-002"
                required
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <input 
                type="text" 
                name="category"
                placeholder="e.g., Metals"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="col-span-1 space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Base Unit *</label>
              <select 
                name="baseUnit"
                value={formData.baseUnit}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="kg">kg</option>
                <option value="ton">ton</option>
                <option value="m">m</option>
                <option value="pcs">pcs</option>
                <option value="box">box</option>
                <option value="cube">cube</option>
              </select>
            </div>
            
            <div className="col-span-1 space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Min Stock Alert</label>
              <input 
                type="number" 
                name="minStockAlert"
                min="0"
                value={formData.minStockAlert}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-md hover:from-emerald-700 hover:to-teal-700 transition font-medium shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterialModal;
