import React, { useState } from 'react';
import { X, Truck, AlertTriangle } from 'lucide-react';
import deliveryService from '../services/deliveryService';

const DeliveryModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    customerShopName: '',
    customerAddress: '',
    storeId: '',
    materialId: '',
    quantity: '',
    unit: 'kg',
    scheduledDate: '',
    notes: ''
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
      const payload = {
        ...formData,
        quantity: Number(formData.quantity)
      };

      await deliveryService.createDelivery(payload);
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to schedule delivery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden scale-[0.85] origin-center">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-emerald-600" /> Schedule New Delivery
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
              <label className="text-xs font-medium text-gray-700">Customer Shop Name *</label>
              <input 
                type="text" 
                name="customerShopName"
                placeholder="e.g. John's Hardware"
                required
                value={formData.customerShopName}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Customer Address</label>
              <input 
                type="text" 
                name="customerAddress"
                placeholder="Delivery Address"
                value={formData.customerAddress}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Store / Location (Dispatch from) *</label>
              <input 
                type="text" 
                name="storeId"
                placeholder="Store ID (e.g., 60d...)"
                required
                value={formData.storeId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Material / SKU *</label>
              <input 
                type="text" 
                name="materialId"
                placeholder="Material ID (e.g., 60d...)"
                required
                value={formData.materialId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Quantity *</label>
              <input 
                type="number" 
                name="quantity"
                step="any"
                required
                value={formData.quantity}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Unit *</label>
              <select 
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="kg">kg</option>
                <option value="ton">ton</option>
                <option value="pcs">pcs</option>
                <option value="box">box</option>
                <option value="m">m</option>
                <option value="cube">cube</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Scheduled Date *</label>
              <input 
                type="date"
                name="scheduledDate"
                required
                value={formData.scheduledDate}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Notes / Instructions</label>
              <textarea 
                name="notes"
                rows="1"
                placeholder="e.g. Call upon arrival"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              ></textarea>
            </div>
          </div>
          
          <div className="bg-emerald-50 p-3 rounded text-sm text-emerald-800 border border-emerald-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-emerald-600" />
            <span>
              This will immediately deduct <strong>{formData.quantity || 0} {formData.unit}</strong> from the selected store's inventory.
            </span>
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
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-md hover:from-emerald-700 hover:to-teal-700 transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Processing...' : 'Schedule Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryModal;
