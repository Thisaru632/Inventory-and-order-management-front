import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Package, Warehouse, TrendingDown, TrendingUp, AlertCircle, PackageCheck, LayoutDashboard, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, BrainCircuit, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import inventoryService from '../services/inventoryService';
import deliveryService from '../services/deliveryService';
import { isSuperAdmin, getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const InventoryDashboard = () => {
  const isSuper = isSuperAdmin();
  const assignedWarehouse = getAssignedWarehouse();
  const [inventoryPreview, setInventoryPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    soldStock: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  });

  const [allInventory, setAllInventory] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [stores, setStores] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedLocation, setSelectedLocation] = useState(() => {
    return assignedWarehouse || 'All Warehouses';
  });
  const [selectedMaterialForAnalysis, setSelectedMaterialForAnalysis] = useState('All Materials');
  const tabs = ['Dashboard', 'Order Calendar', 'Future Predictions', 'Analysis'];
  
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Dynamic calendar setup
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = today.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const calendarOrders = {};
  const activeLoc = assignedWarehouse || selectedLocation;
  const deliveriesForCalendar = allDeliveries.filter(d => 
    !activeLoc || activeLoc === 'All Warehouses' || matchesWarehouse(d.store?.name, activeLoc)
  );

  deliveriesForCalendar.forEach(d => {
    const dDate = new Date(d.scheduledDate || d.createdAt);
    if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
      const day = dDate.getDate();
      if (!calendarOrders[day]) calendarOrders[day] = [];
      calendarOrders[day].push({
        id: `DEL-${d._id.substring(d._id.length - 6).toUpperCase()}`,
        customer: d.customerShopName || 'Unknown Customer',
        product: d.material?.name || 'Unknown Product',
        qty: `${d.quantity} ${d.unit || ''}`.trim(),
        status: d.status || 'PENDING'
      });
    }
  });

  const mockInventory = [];
  const mockPredictions = [];

  const handleDateClick = (day) => {
    if (!day || !calendarOrders[day]) return;
    setSelectedCalendarDate(day);
    setIsCalendarModalOpen(true);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [invRes, txRes, delRes, storesRes] = await Promise.all([
        inventoryService.getStoreStock(),
        inventoryService.getTransactionHistory({ limit: 1000 }),
        deliveryService.getDeliveries(),
        inventoryService.getStores()
      ]);
      
      if (invRes.success && txRes.success) {
        setAllInventory(invRes.data || []);
        setAllTransactions(txRes.data || []);
        setAllDeliveries(delRes?.success ? delRes.data : []);
        setStores(storesRes?.success ? storesRes.data : []);
      } else {
        setAllInventory([]);
        setAllTransactions([]);
        setAllDeliveries([]);
      }
    } catch (err) {
      console.warn('API Error, using empty arrays');
      setAllInventory([]);
      setAllTransactions([]);
      setAllDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener('inventory-updated', fetchDashboardData);
    return () => {
      window.removeEventListener('inventory-updated', fetchDashboardData);
    };
  }, []);

  useEffect(() => {
    let inv = allInventory;
    let txs = allTransactions;
    let dels = allDeliveries;

    const currentLoc = assignedWarehouse || selectedLocation;

    if (currentLoc && currentLoc !== 'All Warehouses') {
      inv = inv.filter(item => matchesWarehouse(item.store?.name, currentLoc));
      txs = txs.filter(tx => matchesWarehouse(tx.store?.name, currentLoc));
      dels = dels.filter(d => matchesWarehouse(d.store?.name, currentLoc));
    }

    let low = 0;
    let out = 0;
    
    inv.forEach(item => {
      if (item.quantityInBaseUnit <= 0) out++;
      else if (item.quantityInBaseUnit <= (item.material?.minStockAlert || 0)) low++;
    });
    
    const sold = txs
      .filter(tx => tx.type === 'STOCK_OUT')
      .reduce((sum, tx) => sum + (tx.convertedBaseQuantity || tx.quantity), 0);
    
    setMetrics({
      totalItems: inv.length,
      lowStock: low,
      outOfStock: out,
      soldStock: sold,
      totalOrders: dels.length,
      pendingOrders: dels.filter(d => d.status === 'PENDING').length,
      deliveredOrders: dels.filter(d => d.status === 'DELIVERED').length,
      cancelledOrders: dels.filter(d => d.status === 'CANCELLED').length
    });
    
    setInventoryPreview(inv.slice(0, 5));
  }, [allInventory, allTransactions, allDeliveries, selectedLocation]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-2">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" /> Dashboard Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">Key metrics and recent inventory status</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
          title="Refresh Dashboard"
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-200 gap-3 pb-2">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-sm text-xs font-medium transition-colors border-b-2 -mb-[3px]
                ${activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {(activeTab === 'Dashboard' || activeTab === 'Analysis') && (
          <div className="flex items-center gap-2 pr-2">
            {assignedWarehouse ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Warehouse:</span>
                <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                  <Warehouse size={14} className="text-blue-600" /> {assignedWarehouse}
                </span>
              </div>
            ) : (
              <>
                <label className="text-xs font-medium text-gray-600">Location:</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 transition"
                >
                  <option value="All Warehouses">All Warehouses</option>
                  {stores.map(store => (
                    <option key={store._id} value={store.name}>{store.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {activeTab === 'Order Calendar' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CalendarIcon className="text-blue-600" /> {monthName}
            </h2>
            <div className="flex gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"><ChevronLeft size={20}/></button>
              <button className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"><ChevronRight size={20}/></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-slate-50/70 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, index) => {
              const orders = day ? calendarOrders[day] : null;
              const hasOrders = orders && orders.length > 0;
              const isToday = day === today.getDate();
              
              return (
                <div 
                  key={index} 
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[100px] bg-white p-2 transition relative 
                    ${!day ? 'bg-slate-50/50' : 'hover:bg-blue-50/40'} 
                    ${hasOrders ? 'cursor-pointer' : ''}
                    ${isToday ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-300' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      {hasOrders && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium border border-blue-100 inline-block shadow-sm">
                            {orders.length} Order{orders.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'Future Predictions' ? (
        <div className="space-y-2">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BrainCircuit size={120} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800/50 rounded-full text-blue-200 text-xs font-medium mb-4">
                <BrainCircuit size={16} /> AI Prediction Engine
              </div>
              <h2 className="text-3xl font-bold mb-2">Next Month Demand Forecast</h2>
              <p className="text-blue-100 max-w-sm">
                Analyzing inventory consumption patterns over the last 60 days to predict optimal stock requirements for the upcoming month.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700">Product / SKU</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-center">2 Months Ago</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-center">Last Month</th>
                    <th className="px-2 py-1 text-sm font-semibold text-blue-700 text-center bg-blue-50/50">Predicted Next Month</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700">Trend</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700 w-1/3">Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockPredictions.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-2 py-1 text-sm">
                        <div className="font-bold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">SKU: {item.sku}</div>
                      </td>
                      <td className="px-2 py-1 text-sm text-center">
                        <span className="font-medium text-gray-700">{item.m1}</span> <span className="text-xs text-gray-500">{item.unit}</span>
                      </td>
                      <td className="px-2 py-1 text-sm text-center">
                        <span className="font-medium text-gray-700">{item.m2}</span> <span className="text-xs text-gray-500">{item.unit}</span>
                      </td>
                      <td className="px-2 py-1 text-sm text-center bg-blue-50/30">
                        <span className="font-bold text-blue-700 text-lg">{item.pred}</span> <span className="text-xs text-blue-500">{item.unit}</span>
                      </td>
                      <td className="px-2 py-1 text-sm">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap
                          ${item.trend === 'up' ? 'bg-green-100 text-green-700' : item.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {item.trend === 'up' ? <TrendingUp size={14} /> : item.trend === 'down' ? <TrendingDown size={14} /> : <BarChart2 size={14} />}
                          {item.pct > 0 ? '+' : ''}{item.pct}%
                        </div>
                      </td>
                      <td className="px-2 py-1 text-sm text-xs text-gray-600 italic leading-relaxed">
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'Analysis' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart2 className="text-blue-600" /> 7-Day Transaction Analysis
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {assignedWarehouse ? `Warehouse: ${assignedWarehouse}` : `Location: ${selectedLocation}`}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Visualizing the volume of incoming stock (Stock In) vs outgoing stock (Stock Out) over the last 7 days.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Filter by Material:</label>
              <select
                value={selectedMaterialForAnalysis}
                onChange={(e) => setSelectedMaterialForAnalysis(e.target.value)}
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 min-w-[150px] transition"
              >
                <option value="All Materials">All Materials</option>
                {Array.from(new Set(
                  [
                    ...allTransactions.filter(tx => !activeLoc || activeLoc === 'All Warehouses' || matchesWarehouse(tx.store?.name, activeLoc)),
                    ...allInventory.filter(item => !activeLoc || activeLoc === 'All Warehouses' || matchesWarehouse(item.store?.name, activeLoc))
                  ]
                  .filter(item => item.material?.name)
                  .map(item => item.material.name)
                )).sort().map(mat => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="h-96 w-full">
            {(() => {
              const analysisTxs = allTransactions.filter(tx => 
                !activeLoc || activeLoc === 'All Warehouses' || matchesWarehouse(tx.store?.name, activeLoc)
              );
              const data = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                const dayStart = new Date(d.setHours(0,0,0,0));
                const dayEnd = new Date(d.setHours(23,59,59,999));
          
                const stockIn = analysisTxs.filter(tx => 
                  tx.type === 'STOCK_IN' && 
                  new Date(tx.createdAt) >= dayStart && 
                  new Date(tx.createdAt) <= dayEnd &&
                  (selectedMaterialForAnalysis === 'All Materials' || tx.material?.name === selectedMaterialForAnalysis)
                ).reduce((sum, tx) => sum + (tx.convertedBaseQuantity || tx.quantity), 0);
          
                const stockOut = analysisTxs.filter(tx => 
                  tx.type === 'STOCK_OUT' && 
                  new Date(tx.createdAt) >= dayStart && 
                  new Date(tx.createdAt) <= dayEnd &&
                  (selectedMaterialForAnalysis === 'All Materials' || tx.material?.name === selectedMaterialForAnalysis)
                ).reduce((sum, tx) => sum + (tx.convertedBaseQuantity || tx.quantity), 0);
          
                data.push({
                  name: dateString,
                  'Stock In': stockIn,
                  'Stock Out': stockOut
                });
              }

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="Stock In" stroke="#10B981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="Stock Out" stroke="#EF4444" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Package size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalOrders}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Pending Orders</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.pendingOrders}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <PackageCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Delivered Orders</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.deliveredOrders}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Cancelled Orders</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.cancelledOrders}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Warehouse size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Stock Items</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalItems}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Low Stock</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.lowStock}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Out of Stock</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.outOfStock}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Sold (Base Unit)</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{metrics.soldStock}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
            <div className="px-2 py-1 text-sm border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <PackageCheck className="text-gray-400" size={18} /> Recent Inventory Details
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700">Material / SKU</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-right">Available</th>
                    <th className="px-2 py-1 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventoryPreview.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                        No recent inventory records found.
                      </td>
                    </tr>
                  ) : (
                    inventoryPreview.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition">
                        <td className="px-2 py-1 text-sm">
                          <div className="font-medium text-gray-800">{item.material?.name || 'Unknown Material'}</div>
                          <div className="text-xs text-gray-500 mt-1">SKU: {item.material?.sku || 'N/A'}</div>
                        </td>
                        <td className="px-2 py-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Warehouse size={16} className="text-gray-400" />
                            {item.store?.name || 'Unknown Store'}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-sm text-right font-medium text-blue-600">
                          {item.availableQuantity} <span className="text-blue-300 text-xs ml-1">{item.material?.baseUnit}</span>
                        </td>
                        <td className="px-2 py-1 text-sm">
                          {item.quantityInBaseUnit <= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle size={12} /> Out of Stock
                            </span>
                          ) : item.quantityInBaseUnit <= (item.material?.minStockAlert || 0) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle size={12} /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Healthy
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Calendar Orders Modal */}
      {isCalendarModalOpen && selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 text-sm border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Orders on {monthName.split(' ')[0]} {selectedCalendarDate}, {currentYear}
              </h2>
              <button onClick={() => setIsCalendarModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-md">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3">
                {calendarOrders[selectedCalendarDate]?.map(order => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">{order.id}</div>
                        <h3 className="font-bold text-gray-900">{order.customer}</h3>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                        ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100 flex justify-between items-center mt-3">
                      <div>
                        <span className="text-gray-500">Product:</span> <span className="font-medium">{order.product}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Qty:</span> <span className="font-bold text-blue-600">{order.qty}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-4 py-3 text-sm border-t border-gray-100 flex justify-end shrink-0 bg-white">
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                className="px-5 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;
