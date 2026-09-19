import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Package, Warehouse, Edit, Trash2 } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import StockTransactionModal from '../components/StockTransactionModal';
import AddMaterialModal from '../components/AddMaterialModal';
import { getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const InventoryList = () => {
  const assignedWarehouse = getAssignedWarehouse();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('STOCK_IN');
  const [modalData, setModalData] = useState({});
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getStoreStock();
      if (res.success) {
        const data = res.data || [];
        const filtered = assignedWarehouse 
          ? data.filter(item => matchesWarehouse(item.store?.name, assignedWarehouse))
          : data;
        setInventory(filtered);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    
    // Listen for updates from sidebar actions
    window.addEventListener('inventory-updated', fetchInventory);
    return () => {
      window.removeEventListener('inventory-updated', fetchInventory);
    };
  }, []);

  const handleTransactionSuccess = () => {
    fetchInventory();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading inventory...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Inventory Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {assignedWarehouse ? `Managing stock for ${assignedWarehouse}` : 'Manage stock across all locations'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchInventory}
            className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
            title="Refresh"
          >
            <RefreshCcw size={20} />
          </button>
          <button 
            onClick={() => setIsAddMaterialModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
          >
            Add Material
          </button>
          <button 
            onClick={() => {
              setModalTab('STOCK_IN');
              setModalData({});
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
          >
            Manage Inventory
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Material / SKU</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Location</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Qty (Base Unit)</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Available</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Unit Cost</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Selling Price</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{item.material?.name || 'Unknown Material'}</div>
                      <div className="text-xs text-gray-500 mt-1">SKU: {item.material?.sku || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Warehouse size={16} className="text-gray-400" />
                        {item.store?.name || 'Unknown Store'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {item.quantityInBaseUnit} <span className="text-gray-400 text-xs ml-1">{item.material?.baseUnit}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">
                      {item.availableQuantity} <span className="text-blue-300 text-xs ml-1">{item.material?.baseUnit}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.unitCost ? `Rs. ${item.unitCost.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.unitSellingPrice ? `Rs. ${item.unitSellingPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {item.quantityInBaseUnit <= (item.material?.minStockAlert || 0) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Healthy
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setModalTab('ADJUSTMENT');
                            setModalData({ 
                              storeId: item.store?._id, 
                              materialId: item.material?._id,
                              unitCost: item.unitCost || '',
                              unitSellingPrice: item.unitSellingPrice || ''
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Edit / Adjust"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm("Are you sure you want to completely delete this inventory record?")) {
                              try {
                                await inventoryService.deleteInventory(item._id);
                                fetchInventory();
                              } catch (err) {
                                alert('Failed to delete inventory record');
                              }
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Record"
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

      <StockTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleTransactionSuccess}
        initialTab={modalTab}
        initialData={modalData}
      />
      
      <AddMaterialModal 
        isOpen={isAddMaterialModalOpen}
        onClose={() => setIsAddMaterialModalOpen(false)}
        onSuccess={() => {
          // You could optionally fetch something here, but the transaction modal fetches its own list on open
        }}
      />
    </div>
  );
};

export default InventoryList;
