import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Package, CheckCircle, AlertTriangle, XCircle, Truck, Download, Calendar, Filter } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import deliveryService from '../services/deliveryService';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  
  // Raw Data from DB
  const [inventories, setInventories] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Filters
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, txRes, matRes] = await Promise.all([
        inventoryService.getStoreStock(),
        deliveryService.getDeliveries({ limit: 5000 }),
        inventoryService.getMaterials()
      ]);

      if (invRes.success) setInventories(invRes.data);
      if (txRes.success) setDeliveries(txRes.data);
      if (matRes.success) setMaterials(matRes.data);
      
    } catch (error) {
      console.error("Failed to fetch report data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process data for table and cards
  const processedData = useMemo(() => {
    let filteredDeliveries = deliveries;
    
    // Apply Date Filter to deliveries
    if (startDate) {
      filteredDeliveries = filteredDeliveries.filter(d => new Date(d.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredDeliveries = filteredDeliveries.filter(d => new Date(d.createdAt) <= end);
    }

    const materialMap = {};

    materials.forEach(mat => {
      materialMap[mat._id] = {
        materialId: mat._id,
        materialName: mat.name,
        minStockAlert: mat.minStockAlert || 0,
        availableStock: 0,
        orderCount: 0,
        deliveredOrderCount: 0,
        cancelledOrderCount: 0,
        deliveredUnitCount: 0,
        deliveredUnitsCost: 0,
        deliveredUnitsPrice: 0,
        unitCost: 0,
        unitSellingPrice: 0,
      };
    });

    // Aggregate Inventory
    inventories.forEach(inv => {
      const matId = inv.material?._id || inv.material;
      if (materialMap[matId]) {
        materialMap[matId].availableStock += inv.availableQuantity || 0;
        if (inv.unitCost) materialMap[matId].unitCost = inv.unitCost;
        if (inv.unitSellingPrice) materialMap[matId].unitSellingPrice = inv.unitSellingPrice;
      }
    });

    // Aggregate Deliveries
    filteredDeliveries.forEach(del => {
      const matId = del.material?._id || del.material;
      if (materialMap[matId]) {
        materialMap[matId].orderCount += 1;
        
        if (del.status === 'DELIVERED' || del.status === 'DISPATCHED') {
          materialMap[matId].deliveredOrderCount += 1;
          materialMap[matId].deliveredUnitCount += del.quantity || 0;
          materialMap[matId].deliveredUnitsCost += ((del.quantity || 0) * materialMap[matId].unitCost);
          materialMap[matId].deliveredUnitsPrice += ((del.quantity || 0) * materialMap[matId].unitSellingPrice);
        } else if (del.status === 'CANCELLED') {
          materialMap[matId].cancelledOrderCount += 1;
        }
      }
    });

    let results = Object.values(materialMap);
    
    // Apply Material Filter
    if (selectedMaterial) {
      results = results.filter(r => r.materialId === selectedMaterial);
    }

    return results;
  }, [inventories, deliveries, materials, startDate, endDate, selectedMaterial]);

  // Calculate Summary Cards based on filtered table data
  const summary = useMemo(() => {
    let totalAvailableStock = 0;
    let totalOrderCount = 0;
    let totalCancelledOrders = 0;
    let totalDeliveredOrders = 0;
    let totalDeliveredUnits = 0;
    let totalOrderCost = 0;
    let totalOrderPrice = 0;

    processedData.forEach(item => {
      totalAvailableStock += item.availableStock || 0;
      totalOrderCount += item.orderCount || 0;
      totalCancelledOrders += item.cancelledOrderCount || 0;
      totalDeliveredOrders += item.deliveredOrderCount || 0;
      totalDeliveredUnits += item.deliveredUnitCount || 0;
      totalOrderCost += item.deliveredUnitsCost || 0;
      totalOrderPrice += item.deliveredUnitsPrice || 0;
    });

    return { 
      totalAvailableStock, 
      totalOrderCount, 
      totalCancelledOrders, 
      totalDeliveredOrders, 
      totalDeliveredUnits, 
      totalOrderCost, 
      totalOrderPrice 
    };
  }, [processedData]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Daily Stock Report
          </h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
            <Calendar size={14} /> {today}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={selectedMaterial} 
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="bg-transparent text-sm text-gray-700 focus:outline-none"
            >
              <option value="">All Materials</option>
              {materials.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5">
            <span className="text-sm text-gray-500">From</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 focus:outline-none"
            />
            <span className="text-sm text-gray-500 ml-1">To</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 focus:outline-none"
            />
          </div>

          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition font-medium text-sm ml-auto lg:ml-0"
          >
            Refresh Data
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium flex items-center gap-2 text-sm">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-lg border border-gray-100">Loading Report Data...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="p-3 bg-gray-50 text-gray-600 rounded-full mb-3">
                <CheckCircle size={20} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Total Orders</p>
              <h3 className="text-xl font-bold text-gray-800">{summary.totalOrderCount}</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
                <XCircle size={20} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Cancelled Orders</p>
              <h3 className="text-xl font-bold text-gray-800">{summary.totalCancelledOrders}</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                <Truck size={20} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Dispatched Orders</p>
              <h3 className="text-xl font-bold text-gray-800">{summary.totalDeliveredOrders}</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-full mb-3">
                <Package size={20} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Dispatched Units</p>
              <h3 className="text-xl font-bold text-gray-800">{summary.totalDeliveredUnits}</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-3">
                <BarChart3 size={20} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Total Cost (Rs)</p>
              <h3 className="text-xl font-bold text-gray-800">{summary.totalOrderCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3">
                <BarChart3 size={20} />
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Total Price (Rs)</p>
              <h3 className="text-xl font-bold text-gray-800">{summary.totalOrderPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Material Delivery & Stock Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-700">Material Name</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Available Stock</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Order Count</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Cancelled Orders</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Dispatched Order Count</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Dispatched Units</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Order Cost (Rs)</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Order Price (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processedData.length > 0 ? (
                    processedData.map((row) => (
                      <tr key={row.materialId} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">{row.materialName}</td>
                        <td className="px-6 py-4 text-center font-medium text-indigo-600">{row.availableStock}</td>
                        <td className="px-6 py-4 text-center text-gray-700">{row.orderCount}</td>
                        <td className="px-6 py-4 text-center text-red-500 font-medium">{row.cancelledOrderCount}</td>
                        <td className="px-6 py-4 text-center text-blue-600">{row.deliveredOrderCount}</td>
                        <td className="px-6 py-4 text-center font-medium text-gray-800">{row.deliveredUnitCount}</td>
                        <td className="px-6 py-4 text-right text-red-600 font-medium">
                          {row.deliveredUnitsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-green-600 font-medium">
                          {row.deliveredUnitsPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No data available for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
