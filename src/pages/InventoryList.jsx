import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Package, Warehouse, Edit, Trash2, Layers, Search, Edit2, X, AlertCircle } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import StockTransactionModal from '../components/StockTransactionModal';
import AddMaterialModal from '../components/AddMaterialModal';
import { getAssignedWarehouse, matchesWarehouse, getCurrentUser, isCashier } from '../utils/auth';

const InventoryList = () => {
  const currentUser = getCurrentUser();
  const isCashierUser = isCashier(currentUser);
  const assignedWarehouse = getAssignedWarehouse(currentUser);
  const [activeTab, setActiveTab] = useState('INVENTORY'); // 'INVENTORY' | 'MATERIALS'
  const [inventory, setInventory] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state for store inventory
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('STOCK_IN');
  const [modalData, setModalData] = useState({});
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

  // Modals state for material list
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [isEditMaterialModalOpen, setIsEditMaterialModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', minStockAlert: 0 });
  const [deleteConfirmMaterial, setDeleteConfirmMaterial] = useState(null);
  const [materialActionLoading, setMaterialActionLoading] = useState(false);
  const [materialActionError, setMaterialActionError] = useState('');

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

  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const res = await inventoryService.getMaterials();
      if (res.success) {
        setMaterials(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const refreshAll = () => {
    fetchInventory();
    fetchMaterials();
  };

  useEffect(() => {
    fetchInventory();
    fetchMaterials();
    
    // Listen for updates from actions across the app
    window.addEventListener('inventory-updated', refreshAll);
    return () => {
      window.removeEventListener('inventory-updated', refreshAll);
    };
  }, []);

  const handleTransactionSuccess = () => {
    refreshAll();
  };

  const handleOpenEditMaterial = (material) => {
    if (isCashierUser) return;
    setEditingMaterial(material);
    setEditFormData({
      name: material.name || '',
      minStockAlert: material.minStockAlert !== undefined ? material.minStockAlert : 0
    });
    setMaterialActionError('');
    setIsEditMaterialModalOpen(true);
  };

  const handleSaveMaterialEdit = async (e) => {
    e?.preventDefault();
    if (isCashierUser || !editingMaterial) return;
    if (!editFormData.name.trim()) {
      setMaterialActionError('Material name is required');
      return;
    }
    const limitNum = Number(editFormData.minStockAlert);
    if (isNaN(limitNum) || limitNum < 0) {
      setMaterialActionError('Out of stock limit must be a valid non-negative number');
      return;
    }

    try {
      setMaterialActionLoading(true);
      setMaterialActionError('');
      const res = await inventoryService.updateMaterial(editingMaterial._id, {
        name: editFormData.name.trim(),
        minStockAlert: limitNum
      });
      if (res?.success) {
        setIsEditMaterialModalOpen(false);
        setEditingMaterial(null);
        setMaterials(prev => prev.map(m => m._id === editingMaterial._id ? { ...m, name: editFormData.name.trim(), minStockAlert: limitNum } : m));
        await fetchMaterials();
        await fetchInventory();
        window.dispatchEvent(new Event('inventory-updated'));
      } else {
        setMaterialActionError(res?.message || 'Failed to update material');
      }
    } catch (err) {
      setMaterialActionError(err.response?.data?.message || err.message || 'Failed to update material');
    } finally {
      setMaterialActionLoading(false);
    }
  };

  const handleOpenDeleteConfirm = (material) => {
    if (isCashierUser) return;
    setDeleteConfirmMaterial(material);
    setMaterialActionError('');
  };

  const handleDeleteMaterial = async () => {
    if (isCashierUser || !deleteConfirmMaterial) return;
    try {
      setMaterialActionLoading(true);
      setMaterialActionError('');
      const res = await inventoryService.deleteMaterial(deleteConfirmMaterial._id);
      if (res?.success) {
        setDeleteConfirmMaterial(null);
        setMaterials(prev => prev.filter(m => m._id !== deleteConfirmMaterial._id));
        await fetchMaterials();
        await fetchInventory();
        window.dispatchEvent(new Event('inventory-updated'));
      } else {
        setMaterialActionError(res?.message || 'Failed to delete material');
      }
    } catch (err) {
      setMaterialActionError(err.response?.data?.message || err.message || 'Failed to delete material');
    } finally {
      setMaterialActionLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const q = materialSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name?.toLowerCase().includes(q) ||
      m.sku?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    );
  });

  if (loading && inventory.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading inventory...</div>;
  }
  if (error && inventory.length === 0) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-emerald-600" /> Inventory List
            </h1>
            {isCashierUser && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                View Only
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isCashierUser
              ? assignedWarehouse 
                ? `Viewing stock levels for ${assignedWarehouse}`
                : 'Viewing stock levels across all locations'
              : assignedWarehouse 
                ? `Managing stock for ${assignedWarehouse}` 
                : 'Manage stock and materials across all locations'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshAll}
            className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
            title="Refresh"
          >
            <RefreshCcw size={20} />
          </button>
          {!isCashierUser && (
            <>
              <button 
                onClick={() => setIsAddMaterialModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-sm shadow-emerald-500/20 transition cursor-pointer"
              >
                Add Material
              </button>
              <button 
                onClick={() => {
                  setModalTab('STOCK_IN');
                  setModalData({});
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-sm shadow-xs transition cursor-pointer"
              >
                Manage Inventory
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 -mb-[1px] ${
            activeTab === 'INVENTORY'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Package size={18} />
          Store Inventory
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'INVENTORY' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-gray-100 text-gray-600'
          }`}>
            {inventory.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('MATERIALS')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 -mb-[1px] ${
            activeTab === 'MATERIALS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layers size={18} />
          Material List
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'MATERIALS' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-gray-100 text-gray-600'
          }`}>
            {materials.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Store Inventory */}
      {activeTab === 'INVENTORY' && (
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
                  {!isCashierUser && (
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={isCashierUser ? 7 : 8} className="px-6 py-8 text-center text-gray-500">
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
                      <td className="px-6 py-4 text-right font-bold text-emerald-700">
                        {item.availableQuantity} <span className="text-emerald-500 text-xs ml-1">{item.material?.baseUnit}</span>
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
                      {!isCashierUser && (
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
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Material List */}
      {activeTab === 'MATERIALS' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Layers className="text-emerald-600" size={20} />
              <div>
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  Master Material List
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {filteredMaterials.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-500">
                  {isCashierUser 
                    ? 'View master material definitions and out of stock limits'
                    : 'Edit material names, update out of stock limits, and delete records'}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search material name, SKU, category..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Material Name</th>
                  <th className="px-6 py-4 font-semibold">SKU / Code</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Base Unit</th>
                  <th className="px-6 py-4 font-semibold bg-amber-50/70 text-amber-900 border-x border-amber-200">
                    Out of Stock Limit
                  </th>
                  {!isCashierUser && (
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={isCashierUser ? 5 : 6} className="px-6 py-12 text-center text-gray-500">
                      <Package size={32} className="mx-auto text-gray-300 mb-2" />
                      No materials found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((mat) => (
                    <tr key={mat._id} className="hover:bg-emerald-50/20 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {mat.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {mat.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {mat.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {mat.baseUnit}
                      </td>
                      <td className="px-6 py-4 bg-amber-50/30 border-x border-amber-100">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100/80 border border-amber-200 text-amber-900 shadow-sm">
                          <AlertTriangle size={13} className="text-amber-600" />
                          <span className="font-bold text-sm">
                            {mat.minStockAlert !== undefined ? mat.minStockAlert : 0}
                          </span>
                          <span className="text-xs font-medium text-amber-700">
                            {mat.baseUnit}
                          </span>
                        </div>
                      </td>
                      {!isCashierUser && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditMaterial(mat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition shadow-xs"
                              title="Edit Material Name and Out of Stock Limit"
                            >
                              <Edit2 size={13} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirm(mat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition shadow-sm"
                              title="Delete Material Record"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals for Admins only */}
      {!isCashierUser && (
        <>
          {/* Stock Transaction Modal */}
          <StockTransactionModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={handleTransactionSuccess}
            initialTab={modalTab}
            initialData={modalData}
          />
          
          {/* Add Material Modal */}
          <AddMaterialModal 
            isOpen={isAddMaterialModalOpen}
            onClose={() => setIsAddMaterialModalOpen(false)} 
            onSuccess={() => {
              refreshAll();
            }}
          />

          {/* Edit Material Modal */}
          {isEditMaterialModalOpen && editingMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Edit2 size={18} className="text-emerald-600" /> Edit Material
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">SKU: {editingMaterial.sku}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditMaterialModalOpen(false);
                      setEditingMaterial(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-md transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveMaterialEdit} className="p-5 space-y-4">
                  {materialActionError && (
                    <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{materialActionError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Material Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Out of Stock Limit <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={editFormData.minStockAlert}
                        onChange={(e) => setEditFormData({ ...editFormData, minStockAlert: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-16 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
                        {editingMaterial.baseUnit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Threshold limit to alert when stock drops to or below this level.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={materialActionLoading}
                      onClick={() => {
                        setIsEditMaterialModalOpen(false);
                        setEditingMaterial(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={materialActionLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {materialActionLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Material Confirmation Modal */}
          {deleteConfirmMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Material</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete <span className="font-semibold text-gray-800">"{deleteConfirmMaterial.name}"</span> ({deleteConfirmMaterial.sku})? This record will be permanently removed.
                  </p>

                  {materialActionError && (
                    <div className="p-2.5 mb-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg text-left">
                      {materialActionError}
                    </div>
                  )}

                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      disabled={materialActionLoading}
                      onClick={() => setDeleteConfirmMaterial(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={materialActionLoading}
                      onClick={handleDeleteMaterial}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow transition flex-1 disabled:opacity-50"
                    >
                      {materialActionLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryList;
