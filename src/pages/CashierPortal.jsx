import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  User, 
  Building, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  X, 
  Calendar,
  Layers,
  PackageCheck,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import inventoryService from '../services/inventoryService';
import saleService from '../services/saleService';
import { getCurrentUser, isSuperAdmin, getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const CashierPortal = () => {
  const currentUser = getCurrentUser();
  const isSuper = isSuperAdmin(currentUser);
  const assignedWarehouse = getAssignedWarehouse(currentUser);

  // Main UI State
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [inventoryList, setInventoryList] = useState([]);
  
  // POS Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Active Bill Cart State
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleError, setSaleError] = useState('');

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Sales History State
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');

  // 1. Fetch Stores & Initial Setup
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await inventoryService.getStores();
        if (res.success && res.data) {
          let storeData = res.data;
          setStores(storeData);

          // Auto-select store based on assigned warehouse or first store
          if (assignedWarehouse) {
            const matched = storeData.find(s => matchesWarehouse(s.name, assignedWarehouse));
            if (matched) {
              setSelectedStoreId(matched._id);
            } else if (storeData.length > 0) {
              setSelectedStoreId(storeData[0]._id);
            }
          } else if (storeData.length > 0) {
            setSelectedStoreId(storeData[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load stores:', err);
      }
    };

    fetchStores();
  }, [assignedWarehouse]);

  // 2. Fetch Store Inventory whenever selected store changes
  const fetchStoreStock = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    setSaleError('');
    try {
      const res = await inventoryService.getStoreStock({ storeId: selectedStoreId });
      if (res.success && res.data) {
        setInventoryList(res.data);
      }
    } catch (err) {
      console.error('Failed to load inventory for store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreStock();
    // Clear cart on store switch to avoid mismatched inventory
    setCartItems([]);
  }, [selectedStoreId]);

  // 3. Fetch Sales History
  const fetchSalesHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (selectedStoreId && !isSuper) {
        params.storeId = selectedStoreId;
      }
      if (historySearch) params.search = historySearch;
      if (historyDate) {
        params.startDate = historyDate;
        params.endDate = historyDate;
      }
      const res = await saleService.getSales(params);
      if (res.success && res.data) {
        setSalesHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load sales history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSalesHistory();
    }
  }, [activeTab, selectedStoreId, historyDate]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    inventoryList.forEach(item => {
      if (item.material?.category) {
        cats.add(item.material.category);
      }
    });
    return Array.from(cats);
  }, [inventoryList]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return inventoryList.filter(item => {
      const mat = item.material || {};
      const matchesSearch = 
        mat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mat.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || mat.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [inventoryList, searchQuery, selectedCategory]);

  // Cart Operations
  const handleAddToCart = (inventoryItem) => {
    const mat = inventoryItem.material;
    if (!mat) return;

    // Check available stock
    const available = inventoryItem.availableQuantity || 0;
    if (available <= 0) {
      setSaleError(`"${mat.name}" is currently out of stock.`);
      return;
    }

    setSaleError('');
    setCartItems(prev => {
      const existing = prev.find(i => i.inventoryId === inventoryItem._id);
      if (existing) {
        if (existing.quantity >= available) {
          setSaleError(`Cannot add more "${mat.name}". Available stock is ${available} ${mat.baseUnit}.`);
          return prev;
        }
        return prev.map(i => i.inventoryId === inventoryItem._id 
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
          : i
        );
      }

      // Default unit & price
      const unit = mat.baseUnit || 'units';
      const unitPrice = inventoryItem.unitSellingPrice || 0;

      return [...prev, {
        inventoryId: inventoryItem._id,
        materialId: mat._id,
        materialName: mat.name,
        sku: mat.sku,
        category: mat.category,
        baseUnit: mat.baseUnit,
        conversions: mat.conversions || [],
        unit,
        maxStock: available,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice * 1
      }];
    });
  };

  const handleUpdateQuantity = (inventoryId, newQty) => {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty <= 0) return;

    setCartItems(prev => prev.map(item => {
      if (item.inventoryId === inventoryId) {
        if (qty > item.maxStock) {
          setSaleError(`Quantity exceeds available stock (${item.maxStock} ${item.baseUnit}) for ${item.materialName}`);
          return { ...item, quantity: item.maxStock, subtotal: item.maxStock * item.unitPrice };
        }
        setSaleError('');
        return { ...item, quantity: qty, subtotal: qty * item.unitPrice };
      }
      return item;
    }));
  };

  const handleUpdateUnitPrice = (inventoryId, newPrice) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;

    setCartItems(prev => prev.map(item => {
      if (item.inventoryId === inventoryId) {
        return { ...item, unitPrice: price, subtotal: item.quantity * price };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (inventoryId) => {
    setCartItems(prev => prev.filter(i => i.inventoryId !== inventoryId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setSaleError('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setBillNotes('');
  };

  // Grand Total Calculations
  const grandTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  }, [cartItems]);

  // Handle Checkout / Sale Submission
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      setSaleError('Cart is empty. Please select items to bill.');
      return;
    }

    if (!selectedStoreId) {
      setSaleError('Please select a branch warehouse before billing.');
      return;
    }

    setSubmittingSale(true);
    setSaleError('');

    try {
      const payload = {
        storeId: selectedStoreId,
        cashierId: currentUser?._id || currentUser?.id,
        cashierName: currentUser?.name || 'Cashier',
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        paymentMethod: 'Cash',
        amountPaid: grandTotal,
        changeGiven: 0,
        notes: billNotes,
        items: cartItems.map(i => ({
          materialId: i.materialId,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice
        }))
      };

      const res = await saleService.createSale(payload);
      if (res.success && res.data) {
        setCompletedSale(res.data);
        setIsReceiptModalOpen(true);
        handleClearCart();
        // Refresh local inventory so available stocks immediately update
        fetchStoreStock();
        // Trigger window event so background metrics sync
        window.dispatchEvent(new Event('inventory-updated'));
      }
    } catch (err) {
      setSaleError(err.response?.data?.message || err.message || 'Failed to complete sale transaction');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Selected Store Object
  const currentStore = stores.find(s => s._id === selectedStoreId);

  // Quick stats computed from recent sales
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = salesHistory.filter(s => new Date(s.createdAt).toDateString() === today);
    const revenue = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const billsCount = todaySales.length;
    const itemsCount = todaySales.reduce((acc, s) => acc + (s.items?.reduce((itemAcc, it) => itemAcc + it.quantity, 0) || 0), 0);
    return { revenue, billsCount, itemsCount };
  }, [salesHistory]);

  return (
    <div className="min-h-full flex flex-col bg-gray-50/80 min-w-0">
      {/* Top Bar: Header, Warehouse Selector, Tabs */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Cashier Portal</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                POS Billing
              </span>
            </div>
            <p className="text-xs text-gray-500">Over-the-counter sales & instant billing</p>
          </div>
        </div>

        {/* Warehouse Branch Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <Building size={16} className="text-gray-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch:</span>
            {isSuper ? (
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-transparent font-medium text-gray-800 focus:outline-none cursor-pointer"
              >
                {stores.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-gray-800">
                {currentStore ? `${currentStore.name} (${currentStore.code})` : (assignedWarehouse || 'Branch')}
              </span>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'pos'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart size={14} />
              New POS Bill
              {cartItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-black">
                  {cartItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt size={14} />
              Sales Records & History
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      {activeTab === 'pos' ? (
        <div className="flex-1 p-2.5 sm:p-4 pb-20 sm:pb-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden min-h-0">
          {/* Left 7 Cols: Product Catalog / Quick Pick */}
          <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[280px] lg:min-h-0">
            {/* Search and Category Filters */}
            <div className="p-3 sm:p-4 border-b border-gray-100 space-y-2.5 sm:space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search material by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  onClick={fetchStoreStock}
                  className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-gray-200 transition"
                  title="Refresh Stock"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Loading store inventory...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm text-center">
                  <PackageCheck size={36} className="text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-600">No materials found</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {searchQuery ? 'Try changing your search term' : 'No inventory records found for this branch warehouse.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProducts.map(item => {
                    const mat = item.material || {};
                    const available = item.availableQuantity || 0;
                    const isOutOfStock = available <= 0;
                    const isLowStock = available > 0 && available <= (mat.minStockAlert || 0);
                    const cartItem = cartItems.find(c => c.inventoryId === item._id);

                    return (
                      <div
                        key={item._id}
                        className={`relative group bg-white border rounded-xl p-3 flex flex-col justify-between transition-all duration-150 ${
                          isOutOfStock 
                            ? 'opacity-60 bg-gray-50/50 border-gray-200' 
                            : cartItem
                            ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                            : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
                        }`}
                      >
                        {/* Selected in Cart Indicator */}
                        {cartItem && (
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                            {cartItem.quantity} in bill
                          </div>
                        )}

                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider">
                              {mat.sku || 'SKU'}
                            </span>
                          </div>

                          <h3 className="font-semibold text-gray-900 text-sm mt-0.5 leading-snug line-clamp-1" title={mat.name}>
                            {mat.name || 'Unnamed Material'}
                          </h3>

                          {mat.category && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 mt-1 font-medium">
                              {mat.category}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-gray-100">
                          {/* Price & Stock Display */}
                          <div className="flex items-baseline justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-gray-500 font-medium">Price</p>
                              <p className="text-sm font-bold text-emerald-700">
                                Rs. {Number(item.unitSellingPrice || 0).toLocaleString()}
                                <span className="text-[10px] text-gray-500 font-normal ml-0.5">/{mat.baseUnit}</span>
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 font-medium">Available</p>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                isOutOfStock
                                  ? 'bg-red-100 text-red-700'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {available} {mat.baseUnit}
                              </span>
                            </div>
                          </div>

                          {/* Add to Bill Button */}
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={isOutOfStock}
                            className={`w-full mt-2.5 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                              isOutOfStock
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : cartItem
                                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                          >
                            <Plus size={14} />
                            {isOutOfStock ? 'Out of Stock' : cartItem ? 'Add More' : 'Add to Bill'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Cols: Multi-Item Live Billing Cart */}
          <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible lg:overflow-hidden min-h-fit lg:min-h-0">
            {/* Cart Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Current Bill</h2>
                  <p className="text-[11px] text-gray-500">
                    {cartItems.length} item{cartItems.length === 1 ? '' : 's'} added
                  </p>
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition flex items-center gap-1 font-medium"
                >
                  <RotateCcw size={12} /> Clear Bill
                </button>
              )}
            </div>

            {/* Error Banner */}
            {saleError && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-700 font-medium">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                <span>{saleError}</span>
              </div>
            )}

            {/* Customer Information Form */}
            <div className="p-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-2 text-xs shrink-0">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07X XXX XXXX"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                />
              </div>
            </div>

            {/* Multi-Item Billed Table */}
            <div className="max-h-72 lg:max-h-none lg:flex-1 overflow-y-auto min-h-0 p-3">
              {cartItems.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-center p-4">
                  <ShoppingCart size={36} className="text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-600 text-sm">Bill is Empty</p>
                  <p className="text-xs text-gray-400 mt-0.5 max-w-xs">
                    Select products from the catalog on the left to create a multi-item bill for physical customers.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const availableUnits = [item.baseUnit, ...(item.conversions || []).map(c => c.unit)].filter(Boolean);

                    return (
                      <div
                        key={item.inventoryId}
                        className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:border-emerald-300 transition flex flex-col gap-2.5"
                      >
                        {/* Row 1: Item Name, SKU & Available Stock tags, and Remove Button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-900 text-sm leading-tight break-words">
                              {item.materialName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                SKU: {item.sku}
                              </span>
                              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                                Stock: {item.maxStock} {item.baseUnit}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.inventoryId)}
                            className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition shrink-0"
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Row 2: Controls (Qty Stepper, Unit Selector, Unit Price, Line Subtotal) */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          {/* Quantity Controls & Unit */}
                          <div className="flex items-center gap-2">
                            {/* Qty Stepper */}
                            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden shadow-inner">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.inventoryId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition font-bold"
                                title="Decrease quantity"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                step="any"
                                min="0.1"
                                max={item.maxStock}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.inventoryId, e.target.value)}
                                className="w-12 h-7 text-center text-xs font-bold text-gray-900 bg-transparent focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.inventoryId, item.quantity + 1)}
                                disabled={item.quantity >= item.maxStock}
                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition font-bold"
                                title="Increase quantity"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            {/* Unit Selector or Display */}
                            {availableUnits.length > 1 ? (
                              <select
                                value={item.unit}
                                onChange={(e) => {
                                  const newUnit = e.target.value;
                                  setCartItems(prev => prev.map(it => it.inventoryId === item.inventoryId ? { ...it, unit: newUnit } : it));
                                }}
                                className="h-7 px-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              >
                                {availableUnits.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                {item.unit}
                              </span>
                            )}
                          </div>

                          {/* Unit Price & Subtotal */}
                          <div className="flex items-center gap-3 ml-auto text-right">
                            <div className="text-right">
                              <label className="text-[10px] text-gray-400 font-semibold uppercase block leading-none">Price</label>
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                                <span className="font-semibold text-gray-500">Rs.</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateUnitPrice(item.inventoryId, e.target.value)}
                                  className="w-16 h-7 text-right px-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="text-right min-w-[75px]">
                              <label className="text-[10px] text-gray-400 font-semibold uppercase block leading-none">Subtotal</label>
                              <div className="text-sm font-black text-emerald-700 mt-0.5 whitespace-nowrap">
                                Rs. {Number(item.subtotal || 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bill Summary & Cash Payment Footer */}
            {cartItems.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 shrink-0">
                {/* Grand Total Bar */}
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Grand Total</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                        <Banknote size={12} /> Cash
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">{cartItems.length} item{cartItems.length === 1 ? '' : 's'} to bill</p>
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    Rs. {Number(grandTotal).toLocaleString()}
                  </div>
                </div>

                {/* Complete Cash Sale Button */}
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={submittingSale || cartItems.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingSale ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Processing Cash Sale & Deducting Stock...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Complete Cash Sale & Generate Bill
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History & Sales Records View */
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Sales Revenue</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">Rs. {Number(todayStats.revenue).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Total Bills</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{todayStats.billsCount} Bills</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Receipt size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Items Sold Today</p>
                <p className="text-xl font-bold text-purple-700 mt-1">{todayStats.itemsCount} Units</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <PackageCheck size={22} />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by Invoice #, Customer Name, or Phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSalesHistory()}
                className="w-full text-sm bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
              />
              <button
                onClick={fetchSalesHistory}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Filter
              </button>
              {(historySearch || historyDate) && (
                <button
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDate('');
                    fetchSalesHistory();
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Sales History Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Warehouse</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Items Billed</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Total Amount</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw size={20} className="animate-spin inline mr-2" /> Loading sales records...
                      </td>
                    </tr>
                  ) : salesHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                        No sales transactions found.
                      </td>
                    </tr>
                  ) : (
                    salesHistory.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-600 text-xs">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-600">
                          {new Date(sale.createdAt).toLocaleDateString()}{' '}
                          <span className="text-gray-400 text-[11px]">
                            {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700">
                          <span className="px-2 py-0.5 rounded bg-gray-100 font-medium">
                            {sale.store?.name || 'Warehouse'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 text-xs">{sale.customerName}</p>
                          {sale.customerPhone && (
                            <p className="text-[11px] text-gray-400">{sale.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-600">
                          <span className="font-semibold text-gray-800">
                            {sale.items?.length || 0} items
                          </span>
                          <span className="text-[11px] text-gray-400 block truncate max-w-[200px]" title={sale.items?.map(i => `${i.materialName} (${i.quantity} ${i.unit})`).join(', ')}>
                            {sale.items?.map(i => i.materialName).join(', ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-sm">
                          Rs. {Number(sale.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setCompletedSale(sale);
                              setIsReceiptModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition"
                          >
                            <Printer size={12} /> View Bill
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            {/* Modal Actions Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <h3 className="font-bold text-gray-800 text-sm">Sale Completed</h3>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="p-6 overflow-y-auto flex-1 font-mono text-xs text-gray-800 space-y-4">
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
                <h2 className="text-lg font-black tracking-wider text-gray-900 font-sans uppercase">
                  SYSTEM TOOL LINK
                </h2>
                <p className="text-[11px] font-sans text-gray-600 font-medium">
                  {completedSale.store?.name || currentStore?.name || 'Branch Warehouse'}
                </p>
                {completedSale.store?.address && (
                  <p className="text-[10px] text-gray-500">{completedSale.store.address}</p>
                )}
                <p className="text-[10px] text-gray-500">Official Sales Receipt / Tax Invoice</p>
              </div>

              {/* Invoice Metadata */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-gray-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice No:</span>
                  <span className="font-bold text-gray-900">{completedSale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span>{new Date(completedSale.createdAt || Date.now()).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cashier:</span>
                  <span>{completedSale.cashierName || currentUser?.name || 'Cashier'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-semibold">{completedSale.customerName}</span>
                </div>
                {completedSale.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span>{completedSale.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div className="border-b border-dashed border-gray-300 pb-3">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-200">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Rate</th>
                      <th className="py-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {completedSale.items?.map((it, idx) => (
                      <tr key={idx} className="py-1">
                        <td className="py-1.5 pr-2 font-medium">
                          {it.materialName}
                          <span className="block text-[9px] text-gray-400">{it.sku}</span>
                        </td>
                        <td className="py-1.5 text-center whitespace-nowrap">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          {Number(it.unitPrice).toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right font-bold whitespace-nowrap">
                          {Number(it.subtotal).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payment Summary */}
              <div className="space-y-1 text-xs pt-1 border-b border-dashed border-gray-300 pb-3">
                <div className="flex justify-between font-black text-sm">
                  <span>TOTAL AMOUNT:</span>
                  <span>Rs. {Number(completedSale.totalAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Payment Method:</span>
                  <span className="font-semibold">{completedSale.paymentMethod || 'Cash'}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-gray-500 pt-1 space-y-1">
                <p className="font-semibold">*** THANK YOU FOR YOUR PURCHASE ***</p>
                <p>Goods sold are verified against stock inventory.</p>
                <p className="font-mono text-[9px]">{completedSale.invoiceNumber}</p>
              </div>
            </div>

            {/* Modal Buttons Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3 print:hidden shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition"
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

export default CashierPortal;
