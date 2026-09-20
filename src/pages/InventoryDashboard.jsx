import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCcw, AlertTriangle, Package, Warehouse, TrendingDown, TrendingUp, 
  AlertCircle, PackageCheck, LayoutDashboard, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, X, BrainCircuit, BarChart2, Search, CheckCircle2, 
  ArrowDownRight, ArrowUpRight, Clock, CalendarDays, Sparkles, ChevronDown, 
  ChevronUp, Layers, HelpCircle, ArrowRight
} from 'lucide-react';
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
  const [allMaterials, setAllMaterials] = useState([]);

  // Prediction Section States
  const [predictionPeriod, setPredictionPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [predictionSearch, setPredictionSearch] = useState('');
  const [predictionStatusFilter, setPredictionStatusFilter] = useState('ALL'); // 'ALL' | 'REFILL' | 'SUFFICIENT'
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);

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
        product: d.items && d.items.length > 1
          ? `${d.items.length} Items (${d.items.map(it => it.material?.name || 'Item').slice(0, 2).join(', ')}${d.items.length > 2 ? '...' : ''})`
          : d.material?.name || d.items?.[0]?.material?.name || 'Unknown Product',
        qty: d.items && d.items.length > 1
          ? `${d.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} Units`
          : `${d.quantity || d.items?.[0]?.quantity || 1} ${d.unit || d.items?.[0]?.unit || ''}`.trim(),
        status: d.status || 'PENDING',
        scheduledDate: d.scheduledDate
      });
    }
  });

  const handleDateClick = (day) => {
    if (!day || !calendarOrders[day]) return;
    setSelectedCalendarDate(day);
    setIsCalendarModalOpen(true);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [invRes, txRes, delRes, storesRes, matRes] = await Promise.all([
        inventoryService.getStoreStock(),
        inventoryService.getTransactionHistory({ limit: 1000 }),
        deliveryService.getDeliveries(),
        inventoryService.getStores(),
        inventoryService.getMaterials()
      ]);
      
      if (invRes.success && txRes.success) {
        setAllInventory(invRes.data || []);
        setAllTransactions(txRes.data || []);
        setAllDeliveries(delRes?.success ? delRes.data : []);
        setStores(storesRes?.success ? storesRes.data : []);
        if (matRes?.success && Array.isArray(matRes.data)) {
          setAllMaterials(matRes.data);
        }
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

  // Prediction and Refill Forecasting Calculation Engine
  const predictionsData = useMemo(() => {
    const matsMap = new Map();
    (allMaterials || []).forEach(m => {
      if (m && (m._id || m.name)) {
        matsMap.set((m._id || m.name).toString(), {
          _id: m._id ? m._id.toString() : '',
          name: m.name || 'Unnamed Material',
          sku: m.sku || 'N/A',
          category: m.category || 'General',
          baseUnit: m.baseUnit || 'units',
          minStockAlert: Number(m.minStockAlert) || 0
        });
      }
    });

    allInventory.forEach(item => {
      const mat = item.material;
      if (mat) {
        const id = (mat._id || mat).toString();
        if (!matsMap.has(id)) {
          matsMap.set(id, {
            _id: mat._id ? mat._id.toString() : id,
            name: mat.name || 'Material',
            sku: mat.sku || 'N/A',
            category: mat.category || 'General',
            baseUnit: mat.baseUnit || 'units',
            minStockAlert: Number(mat.minStockAlert) || 0
          });
        }
      }
    });

    allTransactions.forEach(tx => {
      const mat = tx.material;
      if (mat) {
        const id = (mat._id || mat).toString();
        if (!matsMap.has(id)) {
          matsMap.set(id, {
            _id: mat._id ? mat._id.toString() : id,
            name: mat.name || 'Material',
            sku: mat.sku || 'N/A',
            category: mat.category || 'General',
            baseUnit: mat.baseUnit || 'units',
            minStockAlert: Number(mat.minStockAlert) || 0
          });
        }
      }
    });

    const list = Array.from(matsMap.values());
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return list.map(mat => {
      const isMatch = (target) => {
        if (!target) return false;
        if (typeof target === 'string') {
          return target === mat._id || target.toLowerCase() === mat.name.toLowerCase();
        }
        const tId = target._id ? target._id.toString() : '';
        const tName = (target.name || '').trim().toLowerCase();
        return (mat._id && tId === mat._id) || (mat.name && tName === mat.name.toLowerCase());
      };

      // Current stock in active warehouse or all warehouses
      const matInv = allInventory.filter(item => 
        (!activeLoc || activeLoc === 'All Warehouses' || matchesWarehouse(item.store?.name, activeLoc)) &&
        isMatch(item.material)
      );
      const currentStock = matInv.reduce((sum, item) => {
        const qty = item.availableQuantity !== undefined ? item.availableQuantity : (item.quantityInBaseUnit || 0);
        return sum + (Number(qty) || 0);
      }, 0);

      // Transactions for this material and warehouse
      const matTxs = allTransactions.filter(tx => 
        (!activeLoc || activeLoc === 'All Warehouses' || matchesWarehouse(tx.store?.name, activeLoc)) &&
        isMatch(tx.material)
      );

      const getMovements = (startDate, endDate) => {
        let stockIn = 0;
        let stockOut = 0;
        matTxs.forEach(tx => {
          const txDate = new Date(tx.createdAt);
          if (txDate >= startDate && txDate <= endDate) {
            const rawQty = Math.abs(Number(tx.convertedBaseQuantity !== undefined ? tx.convertedBaseQuantity : tx.quantity) || 0);
            if (tx.type === 'STOCK_IN' || tx.type === 'RETURN_IN') {
              stockIn += rawQty;
            } else if (tx.type === 'STOCK_OUT' || tx.type === 'RETURN_OUT') {
              stockOut += rawQty;
            } else if (tx.type === 'ADJUSTMENT') {
              const signQty = Number(tx.convertedBaseQuantity !== undefined ? tx.convertedBaseQuantity : tx.quantity) || 0;
              if (signQty >= 0) stockIn += signQty;
              else stockOut += Math.abs(signQty);
            }
          }
        });
        return { stockIn, stockOut };
      };

      let pastDetails = {};
      let predictedNeed = 0;
      let trend = 'steady';
      let trendPct = 0;
      let timeframeLabel = '';
      let futureLabel = '';

      if (predictionPeriod === 'daily') {
        timeframeLabel = 'Past 3 Days';
        futureLabel = 'Tomorrow';

        // 3 Days:
        // Day -2 (2 days ago), Day -1 (Yesterday), Day 0 (Today)
        const days = [];
        for (let i = 2; i >= 0; i--) {
          const dStart = new Date(todayStart.getTime() - i * 86400000);
          const dEnd = new Date(dStart.getTime() + 86400000 - 1);
          const mov = getMovements(dStart, dEnd);
          const dateLabel = dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const isToday = i === 0;
          days.push({
            dateLabel: isToday ? `${dateLabel} (Today)` : i === 1 ? `${dateLabel} (Yesterday)` : dateLabel,
            stockIn: mov.stockIn,
            stockOut: mov.stockOut
          });
        }

        const totalIn = days.reduce((sum, d) => sum + d.stockIn, 0);
        const totalOut = days.reduce((sum, d) => sum + d.stockOut, 0);

        const day2Out = days[0].stockOut;
        const day1Out = days[1].stockOut;
        const day0Out = days[2].stockOut;
        const weightedOut = (day0Out * 0.5) + (day1Out * 0.3) + (day2Out * 0.2);
        const simpleAvg = totalOut / 3;
        predictedNeed = Math.round(weightedOut > 0 ? (weightedOut + simpleAvg) / 2 : simpleAvg);

        if (day0Out > day1Out && day0Out > 0) {
          trend = 'up';
          trendPct = day1Out > 0 ? Math.round(((day0Out - day1Out) / day1Out) * 100) : 100;
        } else if (day0Out < day1Out) {
          trend = 'down';
          trendPct = day1Out > 0 ? Math.round(((day0Out - day1Out) / day1Out) * 100) : -50;
        } else {
          trend = 'steady';
          trendPct = 0;
        }

        pastDetails = {
          days,
          totalStockIn: totalIn,
          totalStockOut: totalOut,
          avgOut: Math.round((totalOut / 3) * 10) / 10
        };

      } else if (predictionPeriod === 'weekly') {
        timeframeLabel = 'Past Week';
        futureLabel = 'Next Week';

        const weekStart = new Date(now.getTime() - 7 * 86400000);
        const mov = getMovements(weekStart, now);

        predictedNeed = Math.round(mov.stockOut);

        pastDetails = {
          totalStockIn: mov.stockIn,
          totalStockOut: mov.stockOut,
          avgOutPerDay: Math.round((mov.stockOut / 7) * 10) / 10
        };

        trend = mov.stockOut > mov.stockIn ? 'up' : mov.stockOut < mov.stockIn ? 'down' : 'steady';
        trendPct = mov.stockIn > 0 ? Math.round(((mov.stockOut - mov.stockIn) / mov.stockIn) * 100) : 0;

      } else {
        // monthly
        timeframeLabel = 'Previous Month';
        futureLabel = 'Next Month';

        const monthStart = new Date(now.getTime() - 30 * 86400000);
        const mov = getMovements(monthStart, now);

        predictedNeed = Math.round(mov.stockOut);

        pastDetails = {
          totalStockIn: mov.stockIn,
          totalStockOut: mov.stockOut,
          avgOutPerWeek: Math.round((mov.stockOut / 4.3) * 10) / 10
        };

        trend = mov.stockOut > mov.stockIn ? 'up' : mov.stockOut < mov.stockIn ? 'down' : 'steady';
        trendPct = mov.stockIn > 0 ? Math.round(((mov.stockOut - mov.stockIn) / mov.stockIn) * 100) : 0;
      }

      const minAlert = mat.minStockAlert || 0;
      const targetLevel = predictedNeed + minAlert;
      
      const needsRefill = (currentStock <= 0 && (targetLevel > 0 || minAlert > 0)) || 
                          (minAlert > 0 && currentStock <= minAlert) || 
                          (currentStock < targetLevel);

      const refillAmount = needsRefill ? Math.max(0, Math.round(targetLevel - currentStock)) : 0;
      const projectedBalance = currentStock - predictedNeed;

      return {
        ...mat,
        currentStock,
        pastDetails,
        predictedNeed,
        needsRefill,
        refillAmount,
        projectedBalance,
        targetLevel,
        trend,
        trendPct,
        timeframeLabel,
        futureLabel
      };
    });
  }, [allMaterials, allInventory, allTransactions, activeLoc, predictionPeriod]);

  const filteredPredictions = useMemo(() => {
    return predictionsData.filter(item => {
      const q = predictionSearch.trim().toLowerCase();
      const matchesQuery = !q || 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (predictionStatusFilter === 'REFILL') return item.needsRefill;
      if (predictionStatusFilter === 'SUFFICIENT') return !item.needsRefill;
      return true;
    });
  }, [predictionsData, predictionSearch, predictionStatusFilter]);

  const predictionSummary = useMemo(() => {
    const totalMaterials = predictionsData.length;
    const refillCount = predictionsData.filter(p => p.needsRefill).length;
    const totalDemand = predictionsData.reduce((sum, p) => sum + p.predictedNeed, 0);
    const totalRefill = predictionsData.reduce((sum, p) => sum + p.refillAmount, 0);
    return { totalMaterials, refillCount, totalDemand, totalRefill };
  }, [predictionsData]);

  const formatQty = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    const num = Number(val);
    return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(1);
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
            <LayoutDashboard className="text-emerald-600" /> Dashboard Overview
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-emerald-100 gap-3 pb-3">
        <div className="inline-flex bg-emerald-50/70 p-1 rounded-xl border border-emerald-200/80 gap-1 text-xs sm:text-sm font-semibold shadow-xs">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30' 
                  : 'text-gray-600 hover:text-emerald-800 hover:bg-white/80'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {(activeTab === 'Dashboard' || activeTab === 'Analysis' || activeTab === 'Future Predictions') && (
          <div className="flex items-center gap-2 pr-2">
            {assignedWarehouse ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Warehouse:</span>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
                  <Warehouse size={14} className="text-emerald-600" /> {assignedWarehouse}
                </span>
              </div>
            ) : (
              <>
                <label className="text-xs font-medium text-gray-600">Location:</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 transition"
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
              <CalendarIcon className="text-emerald-600" /> {monthName}
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
                    ${!day ? 'bg-slate-50/50' : 'hover:bg-emerald-50/40'} 
                    ${hasOrders ? 'cursor-pointer' : ''}
                    ${isToday ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-400' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? 'text-emerald-800 font-bold' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      {hasOrders && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md font-semibold border border-emerald-200 inline-block shadow-xs">
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
        <div className="space-y-4">
          {/* Header & Filter Banner */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-2xl shadow-xl shadow-emerald-900/15 p-6 text-white relative overflow-hidden border border-emerald-500/30">
            <div className="absolute top-0 right-0 p-8 opacity-15 pointer-events-none">
              <BrainCircuit size={160} />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 border border-white/30 rounded-full text-white text-xs font-bold mb-3 shadow-xs">
                  <Sparkles size={14} className="text-emerald-200" /> AI Stock Demand & Refill Predictor
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  {predictionPeriod === 'daily' && "Daily Stock Movements & Tomorrow's Forecast"}
                  {predictionPeriod === 'weekly' && "Weekly Consumption & Next Week Demand Forecast"}
                  {predictionPeriod === 'monthly' && "Monthly Velocity & Next Month Refill Forecast"}
                </h2>
                <p className="text-emerald-100 text-sm max-w-2xl mt-1.5 leading-relaxed">
                  {predictionPeriod === 'daily' && "Displaying past 3 days of material stock in & out records to predict tomorrow's required stock, detect deficit risks, and calculate exact refill quantities."}
                  {predictionPeriod === 'weekly' && "Analyzing the past week (last 7 days) of material movements to project next week's inventory requirements and recommend safety buffer refills."}
                  {predictionPeriod === 'monthly' && "Analyzing previous month consumption patterns to forecast next month's stock orders and prevent warehouse stockouts."}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-emerald-100 font-medium">
                  <Warehouse size={14} className="text-emerald-200" />
                  <span>Scope: <strong className="text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">{activeLoc || 'All Warehouses'}</strong></span>
                </div>
              </div>

              {/* Filter Tabs: Daily / Weekly / Monthly */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-emerald-950/40 p-1.5 rounded-xl border border-white/20 backdrop-blur-md self-start lg:self-auto shrink-0 shadow-inner">
                <button
                  onClick={() => setPredictionPeriod('daily')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    predictionPeriod === 'daily'
                      ? 'bg-white text-emerald-800 shadow-md shadow-emerald-950/20 ring-2 ring-white/70'
                      : 'text-emerald-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Clock size={15} />
                  <span>Daily (3 Days &rarr; Tomorrow)</span>
                </button>

                <button
                  onClick={() => setPredictionPeriod('weekly')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    predictionPeriod === 'weekly'
                      ? 'bg-white text-emerald-800 shadow-md shadow-emerald-950/20 ring-2 ring-white/70'
                      : 'text-emerald-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CalendarDays size={15} />
                  <span>Weekly (Past Week &rarr; Next Week)</span>
                </button>

                <button
                  onClick={() => setPredictionPeriod('monthly')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    predictionPeriod === 'monthly'
                      ? 'bg-white text-emerald-800 shadow-md shadow-emerald-950/20 ring-2 ring-white/70'
                      : 'text-emerald-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CalendarIcon size={15} />
                  <span>Monthly (Prev Month &rarr; Next Month)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search material by name, SKU, or category..."
                value={predictionSearch}
                onChange={(e) => setPredictionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-emerald-50/20 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
              />
              {predictionSearch && (
                <button
                  onClick={() => setPredictionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 bg-emerald-50/60 p-1 rounded-xl border border-emerald-200/70">
              <button
                onClick={() => setPredictionStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  predictionStatusFilter === 'ALL'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-white/60'
                }`}
              >
                All Materials ({predictionsData.length})
              </button>

              <button
                onClick={() => setPredictionStatusFilter('REFILL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  predictionStatusFilter === 'REFILL'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <AlertTriangle size={13} />
                Refill Needed ({predictionSummary.refillCount})
              </button>

              <button
                onClick={() => setPredictionStatusFilter('SUFFICIENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  predictionStatusFilter === 'SUFFICIENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 size={13} />
                Sufficient ({predictionsData.length - predictionSummary.refillCount})
              </button>
            </div>
          </div>

          {/* Material-wise Predictions & Stock Movement Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border-b border-emerald-200">
                  <tr>
                    <th className="px-4 py-3.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Material / SKU
                    </th>
                    <th className="px-3 py-3.5 text-xs font-bold text-emerald-950 uppercase tracking-wider text-right">
                      Current Stock
                    </th>
                    <th className="px-3 py-3.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      {predictionPeriod === 'daily' && "Past 3 Days Movements (In & Out)"}
                      {predictionPeriod === 'weekly' && "Past Week Records (In & Out)"}
                      {predictionPeriod === 'monthly' && "Previous Month Records (In & Out)"}
                    </th>
                    <th className="px-3 py-3.5 text-xs font-extrabold text-emerald-900 uppercase tracking-wider text-center bg-emerald-100/70 border-x border-emerald-200/80">
                      {predictionPeriod === 'daily' && "Predicted Tomorrow Need"}
                      {predictionPeriod === 'weekly' && "Predicted Next Week Need"}
                      {predictionPeriod === 'monthly' && "Predicted Next Month Need"}
                    </th>
                    <th className="px-3 py-3.5 text-xs font-bold text-emerald-950 uppercase tracking-wider text-center">
                      Want to Refill?
                    </th>
                    <th className="px-3.5 py-3.5 text-xs font-bold text-emerald-950 uppercase tracking-wider text-right">
                      How Much to Refill
                    </th>
                    <th className="px-2 py-3.5 text-xs font-bold text-emerald-950 uppercase tracking-wider text-center w-12">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPredictions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="text-emerald-300 mb-2" size={40} />
                          <p className="font-semibold text-gray-700 text-sm">No matching material records found</p>
                          <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or status filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPredictions.map((item) => {
                      const isExpanded = expandedMaterialId === item._id;
                      const hasLowStock = item.currentStock <= (item.minStockAlert || 0);
                      const isOutOfStock = item.currentStock <= 0;

                      return (
                        <React.Fragment key={item._id || item.sku}>
                          <tr className="hover:bg-emerald-50/30 transition-colors">
                            {/* Material & SKU */}
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-bold text-gray-900 leading-snug">{item.name}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  {item.sku}
                                </span>
                                {item.category && (
                                  <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-semibold">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Current Available Stock */}
                            <td className="px-3 py-3.5 align-top text-right">
                              <div className="font-extrabold text-gray-900 text-base">
                                {formatQty(item.currentStock)} <span className="text-xs font-semibold text-emerald-700">{item.baseUnit}</span>
                              </div>
                              <div className="mt-1 flex items-center justify-end gap-1.5">
                                <span className="text-[10px] text-gray-500">Min Alert: {item.minStockAlert || 0}</span>
                                {isOutOfStock ? (
                                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" title="Out of stock" />
                                ) : hasLowStock ? (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Low stock" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Healthy" />
                                )}
                              </div>
                            </td>

                            {/* Past Stock In & Out Records */}
                            <td className="px-3 py-3.5 align-top">
                              {predictionPeriod === 'daily' ? (
                                <div className="space-y-1.5">
                                  {/* 3 Days breakdown */}
                                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                                    {item.pastDetails.days?.map((day, idx) => (
                                      <div key={idx} className="bg-emerald-50/30 border border-emerald-100/90 rounded-lg p-1 text-center">
                                        <div className="text-[10px] font-semibold text-emerald-950 truncate" title={day.dateLabel}>
                                          {day.dateLabel}
                                        </div>
                                        <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                          +{formatQty(day.stockIn)}
                                        </div>
                                        <div className="text-[10px] font-bold text-rose-600">
                                          -{formatQty(day.stockOut)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] font-semibold bg-emerald-50/70 px-2 py-1 rounded-lg border border-emerald-200/80">
                                    <span className="text-emerald-950 font-bold">3-Day Total:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-emerald-700 font-bold">In: +{formatQty(item.pastDetails.totalStockIn)}</span>
                                      <span className="text-rose-600 font-bold">Out: -{formatQty(item.pastDetails.totalStockOut)}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : predictionPeriod === 'weekly' ? (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Past 7 Days In:</span>
                                    <span className="font-bold text-emerald-700">+{formatQty(item.pastDetails.totalStockIn)} {item.baseUnit}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Past 7 Days Out:</span>
                                    <span className="font-bold text-rose-600">-{formatQty(item.pastDetails.totalStockOut)} {item.baseUnit}</span>
                                  </div>
                                  <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-0.5 border-t border-emerald-100">
                                    <span>Daily Outflow Rate:</span>
                                    <span className="font-bold text-emerald-900">~{formatQty(item.pastDetails.avgOutPerDay)} {item.baseUnit}/day</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Past 30 Days In:</span>
                                    <span className="font-bold text-emerald-700">+{formatQty(item.pastDetails.totalStockIn)} {item.baseUnit}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Past 30 Days Out:</span>
                                    <span className="font-bold text-rose-600">-{formatQty(item.pastDetails.totalStockOut)} {item.baseUnit}</span>
                                  </div>
                                  <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-0.5 border-t border-emerald-100">
                                    <span>Weekly Outflow Rate:</span>
                                    <span className="font-bold text-emerald-900">~{formatQty(item.pastDetails.avgOutPerWeek)} {item.baseUnit}/wk</span>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Predicted Need / Demand */}
                            <td className="px-3 py-3.5 align-top text-center bg-emerald-50/50 border-x border-emerald-100/80">
                              <div className="font-black text-emerald-800 text-xl">
                                {formatQty(item.predictedNeed)} <span className="text-xs font-bold text-emerald-600">{item.baseUnit}</span>
                              </div>
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  item.trend === 'up' ? 'bg-amber-100 text-amber-800' : item.trend === 'down' ? 'bg-teal-100 text-teal-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {item.trend === 'up' ? <TrendingUp size={11} /> : item.trend === 'down' ? <TrendingDown size={11} /> : <BarChart2 size={11} />}
                                  {item.trend === 'up' ? 'High Outflow' : item.trend === 'down' ? 'Slow Outflow' : 'Steady'}
                                </span>
                              </div>
                            </td>

                            {/* Want to Refill Stock? (Prediction) */}
                            <td className="px-3 py-3.5 align-top text-center">
                              {item.needsRefill ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-sm animate-pulse">
                                  <AlertTriangle size={13} className="text-amber-600" />
                                  YES (Refill)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm">
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  NO (Sufficient)
                                </span>
                              )}
                              <div className="text-[10px] text-gray-400 mt-1">
                                {item.currentStock <= 0 
                                  ? 'Depleted Stock' 
                                  : item.needsRefill 
                                  ? `Buffer Shortfall` 
                                  : 'Covered'}
                              </div>
                            </td>

                            {/* How Much to Refill? */}
                            <td className="px-3.5 py-3.5 align-top text-right">
                              {item.needsRefill ? (
                                <div>
                                  <div className="inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-300 rounded-lg text-amber-900 font-extrabold text-sm shadow-sm">
                                    +{formatQty(item.refillAmount)} <span className="text-xs font-bold text-amber-700">{item.baseUnit}</span>
                                  </div>
                                  <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                                    Target: {formatQty(item.targetLevel)} {item.baseUnit}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md inline-block">
                                    0 {item.baseUnit} (Optimal)
                                  </span>
                                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                    Surplus: +{formatQty(Math.max(0, item.currentStock - item.targetLevel))} {item.baseUnit}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Details toggle */}
                            <td className="px-2 py-3.5 align-top text-center">
                              <button
                                onClick={() => setExpandedMaterialId(isExpanded ? null : item._id)}
                                className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                title="View calculation breakdown"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                          </tr>

                          {/* Expandable Calculation Breakdown Drawer */}
                          {isExpanded && (
                            <tr className="bg-emerald-50/20 border-b border-emerald-100">
                              <td colSpan="7" className="p-4 text-xs">
                                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-3">
                                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm border-b border-emerald-100 pb-2">
                                    <BrainCircuit size={16} className="text-emerald-600" />
                                    <span>Refill Calculation Breakdown &mdash; {item.name}</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                      <span className="text-gray-500 block text-[11px]">1. Current Available Stock</span>
                                      <strong className="text-gray-900 text-sm">{formatQty(item.currentStock)} {item.baseUnit}</strong>
                                    </div>
                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                      <span className="text-gray-500 block text-[11px]">2. Min Safety Limit</span>
                                      <strong className="text-gray-900 text-sm">{formatQty(item.minStockAlert || 0)} {item.baseUnit}</strong>
                                    </div>
                                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                                      <span className="text-emerald-700 block text-[11px] font-semibold">3. Predicted {item.futureLabel} Need</span>
                                      <strong className="text-emerald-900 text-sm font-extrabold">{formatQty(item.predictedNeed)} {item.baseUnit}</strong>
                                    </div>
                                    <div className={`p-2.5 rounded-lg border ${
                                      item.needsRefill ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    }`}>
                                      <span className="block text-[11px] font-semibold">4. Suggested Refill Order</span>
                                      <strong className="text-sm font-extrabold">
                                        {item.needsRefill ? `+${formatQty(item.refillAmount)} ${item.baseUnit}` : `0 ${item.baseUnit}`}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-emerald-800 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                    <HelpCircle size={14} className="text-emerald-600 shrink-0" />
                                    <span>
                                      Formula: Target Buffer = (Predicted Need: {formatQty(item.predictedNeed)} + Safety Limit: {formatQty(item.minStockAlert || 0)} = {formatQty(item.targetLevel)} {item.baseUnit}). 
                                      {item.needsRefill 
                                        ? ` Current stock (${formatQty(item.currentStock)} ${item.baseUnit}) is below target by ${formatQty(item.refillAmount)} ${item.baseUnit}. Refill is recommended.` 
                                        : ` Current stock (${formatQty(item.currentStock)} ${item.baseUnit}) covers predicted consumption and safety buffer.`
                                      }
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
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
                  <BarChart2 className="text-emerald-600" /> 7-Day Transaction Analysis
                </h2>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
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
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 min-w-[150px] transition"
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
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
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
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
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

            <div className={`bg-white rounded-xl shadow-sm border p-3 flex flex-col justify-between relative transition-all ${
              metrics.outOfStock > 0 ? 'border-red-400 ring-2 ring-red-400/20' : 'border-gray-100'
            }`}>
              {/* Blinking Out of Stock Alert on top of the card */}
              {metrics.outOfStock > 0 && (
                <div className="mb-2 -mt-1 -mx-1 px-2.5 py-1 bg-red-600 text-white text-[11px] font-bold rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>{metrics.outOfStock} MATERIAL{metrics.outOfStock > 1 ? 'S' : ''} OUT OF STOCK!</span>
                  </span>
                  <span className="text-[10px] bg-red-800 px-1.5 py-0.5 rounded font-mono">ALERT</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg flex-shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Out of Stock</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
                    <span className={metrics.outOfStock > 0 ? 'text-red-600 font-extrabold' : ''}>
                      {metrics.outOfStock}
                    </span>
                    {metrics.outOfStock > 0 && (
                      <span className="text-xs font-bold text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Critical
                      </span>
                    )}
                  </h3>
                </div>
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
                        <td className="px-2 py-1 text-sm text-right font-medium text-emerald-700">
                          {item.availableQuantity} <span className="text-emerald-500 text-xs ml-1">{item.material?.baseUnit}</span>
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
                  <div key={order.id} className="border border-gray-200 rounded-lg p-3 hover:border-emerald-300 transition">
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
                        <div><span className="text-gray-500">Product:</span> <span className="font-medium">{order.product}</span></div>
                        {order.scheduledDate && (
                          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                            <CalendarIcon size={12} /> Delivery: {new Date(order.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Qty:</span> <span className="font-bold text-emerald-700">{order.qty}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-4 py-3 text-sm border-t border-gray-100 flex justify-end shrink-0 bg-white">
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition font-bold shadow-sm shadow-emerald-500/20"
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
