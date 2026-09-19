import React, { useState, useEffect } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, RefreshCcw, Activity, AlertTriangle } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import { getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const StockTransactionModal = ({ isOpen, onClose, onSuccess, initialTab = 'STOCK_IN', initialData = {} }) => {
  const assignedWarehouse = getAssignedWarehouse();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stores, setStores] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      if (!isOpen) return;
      try {
        const [storesRes, materialsRes, suppliersRes] = await Promise.all([
          inventoryService.getStores(),
          inventoryService.getMaterials(),
          inventoryService.getSuppliers()
        ]);
        if (storesRes.success) {
          setStores(storesRes.data);
          if (assignedWarehouse) {
            const matched = storesRes.data.find(s => matchesWarehouse(s.name, assignedWarehouse));
            if (matched) {
              setFormData(prev => ({ ...prev, storeId: matched._id }));
            }
          }
        }
        if (materialsRes.success) setMaterials(materialsRes.data);
        if (suppliersRes.success) setSuppliers(suppliersRes.data);
      } catch (err) {
        console.error("Failed to fetch master data", err);
      }
    };
    fetchMasterData();
  }, [isOpen, assignedWarehouse]);

  const [formData, setFormData] = useState({
    storeId: initialData.storeId || '',
    materialId: initialData.materialId || '',
    supplierId: '',
    quantity: '',
    unit: 'kg', // Default, should be dynamic based on material
    unitCost: initialData.unitCost || '',
    unitSellingPrice: initialData.unitSellingPrice || '',
    imageUrl: initialData.imageUrl || '',
    referenceNumber: '',
    reason: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        storeId: initialData.storeId || '',
        materialId: initialData.materialId || '',
        unitCost: initialData.unitCost || '',
        unitSellingPrice: initialData.unitSellingPrice || '',
        imageUrl: initialData.imageUrl || '',
        quantity: '' // Reset quantity for the new transaction
      }));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'STOCK_IN', label: 'Stock In', icon: <ArrowDownCircle size={16} /> },
    { id: 'STOCK_OUT', label: 'Stock Out', icon: <ArrowUpCircle size={16} /> },
    { id: 'ADJUSTMENT', label: 'Adjustment', icon: <Activity size={16} /> },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'materialId') {
      const selectedMat = materials.find(m => m._id === value);
      if (selectedMat) {
        setFormData(prev => ({ ...prev, materialId: value, unit: selectedMat.baseUnit }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
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

      if (activeTab === 'STOCK_IN') {
        await inventoryService.recordStockIn(payload);
      } else if (activeTab === 'STOCK_OUT') {
        await inventoryService.recordStockOut(payload);
      } else if (activeTab === 'RETURN') {
        // Assume RETURN_IN for this simple demo
        await inventoryService.recordReturn({ ...payload, returnType: 'RETURN_IN' });
      } else if (activeTab === 'ADJUSTMENT') {
        await inventoryService.recordAdjustment(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedMaterial = materials.find(m => m._id === formData.materialId);
  const availableUnits = selectedMaterial 
    ? [selectedMaterial.baseUnit, ...(selectedMaterial.conversions || []).map(c => c.unit)]
    : ['kg', 'ton', 'pcs', 'box'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden scale-[0.85] origin-center">
        <div className="flex justify-between items-center px-2 py-1 text-sm border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">New Inventory Transaction</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Store / Location *</label>
              <select 
                name="storeId"
                required
                value={formData.storeId}
                onChange={handleInputChange}
                disabled={Boolean(assignedWarehouse)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-700"
              >
                {!assignedWarehouse && <option value="">Select a Store</option>}
                {stores
                  .filter(s => !assignedWarehouse || matchesWarehouse(s.name, assignedWarehouse))
                  .map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Material / SKU *</label>
              <select 
                name="materialId"
                required
                value={formData.materialId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a Material</option>
                {materials.map(m => <option key={m._id} value={m._id}>{m.name} ({m.sku})</option>)}
              </select>
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
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Unit *</label>
              <select 
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Unit Cost</label>
              <input 
                type="number" 
                name="unitCost"
                step="any"
                min="0"
                value={formData.unitCost}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Unit Selling Price</label>
              <input 
                type="number" 
                name="unitSellingPrice"
                step="any"
                min="0"
                value={formData.unitSellingPrice}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Reference Number</label>
              <input 
                type="text" 
                name="referenceNumber"
                placeholder="PO-12345 or SO-98765"
                value={formData.referenceNumber}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-gray-700">Product Image</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="mt-2 h-16 object-cover rounded border border-gray-200" />}
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-medium text-gray-700">Notes / Reason</label>
            <textarea 
              name="reason"
              rows="1"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>
          
          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              Preview: Transacting <strong>{formData.quantity || 0} {formData.unit}</strong>. 
              {activeTab === 'ADJUSTMENT' && ' Note: For adjustments, use positive values to add stock and negative values to remove stock.'}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Processing...' : 'Confirm Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransactionModal;
