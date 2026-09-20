import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import InventoryDashboard from './pages/InventoryDashboard';
import InventoryList from './pages/InventoryList';
import DeliveryManagement from './pages/DeliveryManagement';
import CustomerItemList from './pages/CustomerItemList';
import CustomerOrderList from './pages/CustomerOrderList';
import CustomerProfile from './pages/CustomerProfile';
import UserManagement from './pages/UserManagement';
import CustomerUserList from './pages/CustomerUserList';
import Reports from './pages/Reports';
import WarehouseManagement from './pages/WarehouseManagement';
import TransactionAuditLog from './components/TransactionAuditLog';
import Login from './pages/Login';
import { LayoutDashboard, History, List, Truck, Users, ChevronDown, ChevronRight, ShoppingBag, Package, UserCog, BarChart3, Building, Bell, AlertCircle, LogOut, UserCheck, X, Check, AlertTriangle } from 'lucide-react';
import inventoryService from './services/inventoryService';
import deliveryService from './services/deliveryService';
import { playOrderAlertSound } from './utils/sound';

import { isSuperAdmin, isCustomer, isAdmin, getAssignedWarehouse, matchesWarehouse } from './utils/auth';

function App() {
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [isOutOfStockPopupOpen, setIsOutOfStockPopupOpen] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState([]);
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [activeOrderPopup, setActiveOrderPopup] = useState(null);
  
  const seenOrderIdsRef = useRef(new Set());
  const isInitialFetchRef = useRef(true);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isSuper = isSuperAdmin(user);
  const isCust = isCustomer(user);
  const isAdminUser = isSuper || isAdmin(user);
  const assignedWarehouse = getAssignedWarehouse(user);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    // Clear session popup key so out of stock popup appears once upon login
    const userKey = userData?.id || userData?._id || userData?.email || 'admin';
    try {
      sessionStorage.removeItem(`out_of_stock_popup_seen_${userKey}`);
    } catch (e) {}
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    setIsOutOfStockPopupOpen(false);
  };

  const checkStockAlerts = async () => {
    try {
      const res = await inventoryService.getStoreStock();
      if (res.success && res.data && res.data.length > 0) {
        let stock = res.data;
        if (assignedWarehouse) {
          stock = stock.filter(item => matchesWarehouse(item.store?.name, assignedWarehouse));
        }
        const outOfStock = stock.filter(item => item.quantityInBaseUnit <= 0);
        setOutOfStockItems(outOfStock);

        // When admin or super admin logs into the system, display out of stock list as a popup once
        if (outOfStock.length > 0 && isAdminUser) {
          const userKey = user?.id || user?._id || user?.email || 'admin';
          const sessionPopupKey = `out_of_stock_popup_seen_${userKey}`;
          const alreadySeen = sessionStorage.getItem(sessionPopupKey);
          if (!alreadySeen) {
            setIsOutOfStockPopupOpen(true);
            sessionStorage.setItem(sessionPopupKey, 'true');
          }
        }
      } else {
        setOutOfStockItems([]);
      }
    } catch (err) {
      setOutOfStockItems([]);
    }
  };

  const checkOrderNotifications = async (isManualEvent = false) => {
    try {
      const res = await deliveryService.getDeliveries();
      if (res.success && Array.isArray(res.data)) {
        const userKey = user?.id || user?._id || user?.email || 'admin';
        const storageKey = `dismissed_orders_${userKey}`;
        let dismissedIds = [];
        try {
          dismissedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (e) {
          dismissedIds = [];
        }

        let orders = res.data;
        // Scoped for warehouse admin
        if (assignedWarehouse) {
          orders = orders.filter(o => matchesWarehouse(o.store?.name, assignedWarehouse));
        }

        // Only active incoming pending orders (do not display dispatched, delivered, or cancelled orders in notifications)
        orders = orders.filter(o => {
          const status = (o.status || 'PENDING').toUpperCase();
          return status === 'PENDING';
        });

        // Active un-dismissed notifications (status PENDING or new orders)
        const unreadOrders = orders.filter(o => !dismissedIds.includes(o._id));

        // Check if there is a brand-new order that was not seen yet
        if (!isInitialFetchRef.current) {
          const newlyArrived = unreadOrders.filter(o => !seenOrderIdsRef.current.has(o._id));
          if (newlyArrived.length > 0 || isManualEvent) {
            playOrderAlertSound();
            const orderToShow = newlyArrived[0] || (unreadOrders.length > 0 ? unreadOrders[0] : null);
            if (orderToShow) {
              setActiveOrderPopup(orderToShow);
            }
          }
        } else {
          isInitialFetchRef.current = false;
        }

        // Automatically close popup if the active order is no longer in pending notifications
        setActiveOrderPopup(prev => {
          if (!prev) return null;
          return unreadOrders.some(o => o._id === prev._id) ? prev : null;
        });

        unreadOrders.forEach(o => seenOrderIdsRef.current.add(o._id));
        setOrderNotifications(unreadOrders);
      }
    } catch (err) {
      console.warn("Failed to check order notifications:", err.message);
    }
  };

  const handleOpenOrderNotification = (order) => {
    const userKey = user?.id || user?._id || user?.email || 'admin';
    const storageKey = `dismissed_orders_${userKey}`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!existing.includes(order._id)) {
        existing.push(order._id);
        localStorage.setItem(storageKey, JSON.stringify(existing));
      }
    } catch (e) {}

    // Immediately remove from notification section
    setOrderNotifications(prev => prev.filter(o => o._id !== order._id));
    setSelectedOrderModal(order);
  };

  const handleDismissNotification = (e, orderId) => {
    e.stopPropagation();
    const userKey = user?.id || user?._id || user?.email || 'admin';
    const storageKey = `dismissed_orders_${userKey}`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!existing.includes(orderId)) {
        existing.push(orderId);
        localStorage.setItem(storageKey, JSON.stringify(existing));
      }
    } catch (e) {}
    setOrderNotifications(prev => prev.filter(o => o._id !== orderId));
  };

  const handleClearAllOrderNotifications = () => {
    const userKey = user?.id || user?._id || user?.email || 'admin';
    const storageKey = `dismissed_orders_${userKey}`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      orderNotifications.forEach(o => {
        if (!existing.includes(o._id)) existing.push(o._id);
      });
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (e) {}
    setOrderNotifications([]);
  };

  useEffect(() => {
    if (isAuthenticated && !isCust) {
      checkStockAlerts();
      checkOrderNotifications();

      // Poll every 5s so new orders placed on other devices trigger alert sound
      const interval = setInterval(() => {
        checkOrderNotifications();
      }, 5000);

      const handleInventoryUpdate = () => checkStockAlerts();
      const handleNewOrder = () => checkOrderNotifications(true);
      const handleStorage = (e) => {
        if (e.key === 'last_customer_order_time') {
          checkOrderNotifications(true);
        }
      };

      window.addEventListener('inventory-updated', handleInventoryUpdate);
      window.addEventListener('new-customer-order', handleNewOrder);
      window.addEventListener('storage', handleStorage);

      return () => {
        clearInterval(interval);
        window.removeEventListener('inventory-updated', handleInventoryUpdate);
        window.removeEventListener('new-customer-order', handleNewOrder);
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [isAuthenticated, assignedWarehouse, isCust]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              System Tool Link
            </h1>
          </div>
          {/* Navigation */}
          {isCust ? (
            <nav className="flex-1 p-4 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Customer Portal
              </div>
              <Link 
                to="/customer/items" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <Package size={18} />
                Product Catalog
              </Link>
              <Link 
                to="/customer/orders" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <ShoppingBag size={18} />
                My Orders
              </Link>
              <Link 
                to="/customer/profile" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <UserCog size={18} />
                My Profile
              </Link>
            </nav>
          ) : (
            <nav className="flex-1 p-4 space-y-1">
              <Link 
                to="/" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <Link 
                to="/audit-log" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <History size={18} />
                Audit Log
              </Link>
              <Link 
                to="/inventory-list" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <List size={18} />
                Inventory List
              </Link>
              <Link 
                to="/deliveries" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <Truck size={18} />
                Delivery and Order Manage
              </Link>
              
              {/* Customer Portal Dropdown */}
              <div className="pt-2">
                <button 
                  onClick={() => setIsCustomerPortalOpen(!isCustomerPortalOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} />
                    Customer Portal
                  </div>
                  {isCustomerPortalOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                
                {isCustomerPortalOpen && (
                  <div className="pl-10 pr-3 mt-1 space-y-1">
                    <Link 
                      to="/customer/items" 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      <Package size={16} />
                      Item List
                    </Link>
                    <Link 
                      to="/customer/orders" 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      <ShoppingBag size={16} />
                      Order List
                    </Link>
                  </div>
                )}
              </div>
              
              {/* User Management - Super Admin Only */}
              {isSuper && (
                <Link 
                  to="/users" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <UserCog size={18} />
                  User Management
                </Link>
              )}

              {/* Customer User List - Super Admin & Admin Only */}
              {isAdminUser && (
                <Link 
                  to="/customer-users" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <UserCheck size={18} />
                  Customer User List
                </Link>
              )}
              
              {/* Reports */}
              <Link 
                  to="/reports" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <BarChart3 size={18} />
                Reports
              </Link>
              
              {/* Warehouse Management */}
              <Link 
                to="/warehouse" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <Building size={18} />
                Warehouse Management
              </Link>
            </nav>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 shadow-sm z-20">
            <div className="flex-1"></div>
            <div className="flex items-center gap-6">
              
              {/* Notification Bell - Staff Only */}
              {!isCust && (
                <div className="relative">
                  <button 
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                    title="Notifications"
                  >
                    <Bell size={20} />
                    {(orderNotifications.length > 0 || outOfStockItems.length > 0) && (
                      <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white ${
                        orderNotifications.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                      }`}>
                        {orderNotifications.length > 0 ? orderNotifications.length : outOfStockItems.length}
                      </span>
                    )}
                  </button>
                  
                  {/* Notification Dropdown */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                          {(orderNotifications.length > 0 || outOfStockItems.length > 0) && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              orderNotifications.length > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {orderNotifications.length > 0 ? `${orderNotifications.length} New Orders` : `${outOfStockItems.length} Alerts`}
                            </span>
                          )}
                        </div>
                        {orderNotifications.length > 0 && (
                          <button
                            onClick={handleClearAllOrderNotifications}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                        {/* New Customer Orders Section */}
                        {orderNotifications.length > 0 && (
                          <div>
                            <div className="px-4 py-1.5 bg-blue-50/70 text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <ShoppingBag size={12} /> New Customer Orders
                              </span>
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                              </span>
                            </div>

                            {orderNotifications.map((order) => (
                              <div 
                                key={order._id}
                                onClick={() => handleOpenOrderNotification(order)}
                                className="p-3.5 hover:bg-blue-50/30 transition cursor-pointer flex items-start gap-3 relative group"
                              >
                                <div className="mt-0.5 p-2 bg-blue-100 text-blue-700 rounded-xl flex-shrink-0 shadow-sm">
                                  <ShoppingBag size={16} />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-gray-900 truncate">
                                      {order.customerShopName || 'Customer Order'}
                                    </p>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                      {order.status || 'PENDING'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-medium mt-0.5 truncate">
                                    {order.material?.name || 'Item'} × {order.quantity} {order.unit}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                                    <span className="inline-block px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded font-medium">
                                      {order.store?.name || 'Warehouse'}
                                    </span>
                                    {order.createdAt && (
                                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                  </div>
                                  <div className="mt-1.5">
                                    <span className="text-[11px] text-blue-600 font-semibold group-hover:underline">
                                      Open details &rarr;
                                    </span>
                                  </div>
                                </div>
                                {/* Dismiss button */}
                                <button
                                  onClick={(e) => handleDismissNotification(e, order._id)}
                                  className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition"
                                  title="Dismiss notification"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Stock Alerts Section */}
                        {outOfStockItems.length > 0 && (
                          <div>
                            {orderNotifications.length > 0 && (
                              <div className="px-4 py-1.5 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                Inventory Alerts
                              </div>
                            )}
                            {outOfStockItems.map((item, idx) => (
                              <div key={idx} className="p-3.5 hover:bg-gray-50 transition flex items-start gap-3">
                                <div className="mt-0.5 text-red-500 bg-red-50 p-1.5 rounded-full flex-shrink-0">
                                  <AlertCircle size={16} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-900">
                                    Out of Stock: {item.material?.name}
                                  </p>
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    Code: <span className="font-semibold text-gray-700">{item.material?.sku}</span>
                                    {item.store?.name && ` • ${item.store.name}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Empty State */}
                        {orderNotifications.length === 0 && outOfStockItems.length === 0 && (
                          <div className="p-6 text-center text-sm text-gray-500">
                            <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                            <p className="font-medium text-gray-700">All caught up!</p>
                            <p className="text-xs text-gray-400 mt-0.5">No active orders or stock alerts.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-gray-800">{user?.name || user?.email?.split('@')[0]}</div>
                  <div className={`text-xs font-medium ${isCust ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isCust 
                      ? 'Customer Portal' 
                      : isSuper 
                      ? 'Super Admin (All Warehouses)' 
                      : `${user?.role || 'Admin'} • ${assignedWarehouse || 'All Warehouses'}`}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm" title={user?.name}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A')}
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto bg-gray-50">
            <Routes>
              {isCust ? (
                <>
                  <Route path="/" element={<Navigate to="/customer/items" replace />} />
                  <Route path="/customer/items" element={<CustomerItemList />} />
                  <Route path="/customer/orders" element={<CustomerOrderList />} />
                  <Route path="/customer/profile" element={<CustomerProfile user={user} onUpdateUser={(u) => setUser(u)} />} />
                  <Route path="*" element={<Navigate to="/customer/items" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<InventoryDashboard />} />
                  <Route path="/inventory-list" element={<InventoryList />} />
                  <Route path="/deliveries" element={<DeliveryManagement />} />
                  <Route path="/audit-log" element={<TransactionAuditLog />} />
                  <Route path="/customer/items" element={<CustomerItemList />} />
                  <Route path="/customer/orders" element={<CustomerOrderList />} />
                  <Route path="/customer/profile" element={<CustomerProfile user={user} onUpdateUser={(u) => setUser(u)} />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/customer-users" element={isAdminUser ? <CustomerUserList /> : <Navigate to="/" replace />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/warehouse" element={<WarehouseManagement />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
        {/* Real-time Incoming Order Popup Banner */}
        {activeOrderPopup && !isCust && (
          <div className="fixed top-20 right-6 z-[95] w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border-2 border-blue-600 p-4 animate-in slide-in-from-top-6 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/30 flex-shrink-0 animate-bounce">
                  <ShoppingBag size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">New Order Received!</h4>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-700 mt-0.5 truncate">
                    {activeOrderPopup.customerShopName}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5 font-medium truncate">
                    {activeOrderPopup.material?.name} × <span className="font-bold">{activeOrderPopup.quantity} {activeOrderPopup.unit}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-semibold truncate">
                      {activeOrderPopup.store?.name || 'Warehouse'}
                    </span>
                    {activeOrderPopup.customerAddress && (
                      <span className="truncate max-w-[140px] text-gray-500" title={activeOrderPopup.customerAddress}>
                        {activeOrderPopup.customerAddress}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  handleDismissNotification(e, activeOrderPopup._id);
                  setActiveOrderPopup(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
                title="Dismiss popup"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-400">Click to view & clear</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    handleDismissNotification(e, activeOrderPopup._id);
                    setActiveOrderPopup(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    const ord = activeOrderPopup;
                    setActiveOrderPopup(null);
                    handleOpenOrderNotification(ord);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Order Notification Detail Modal */}
        {selectedOrderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shadow-sm">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Customer Order Placed</h3>
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check size={12} /> Removed from notifications
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrderModal(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100">
                  <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Customer Information</span>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{selectedOrderModal.customerShopName}</p>
                  {selectedOrderModal.customerAddress && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold text-gray-700">Delivery Address:</span> {selectedOrderModal.customerAddress}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase font-medium">Ordered Item</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedOrderModal.material?.name || 'Product'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">SKU: {selectedOrderModal.material?.sku || '—'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase font-medium">Quantity</p>
                    <p className="text-lg font-bold text-blue-600 mt-0.5">
                      {selectedOrderModal.quantity} {selectedOrderModal.unit}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase font-medium">Warehouse</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedOrderModal.store?.name || 'Main Warehouse'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase font-medium">Status</p>
                    <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {selectedOrderModal.status || 'PENDING'}
                    </span>
                  </div>
                </div>

                {selectedOrderModal.createdAt && (
                  <p className="text-xs text-gray-400 text-right">
                    Ordered: {new Date(selectedOrderModal.createdAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <Link
                  to="/deliveries"
                  onClick={() => {
                    setSelectedOrderModal(null);
                    setIsNotificationOpen(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition"
                >
                  View in Deliveries
                </Link>
                <button
                  onClick={() => setSelectedOrderModal(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Out of Stock List Popup Modal (Displayed once on Admin / Super Admin Login) */}
        {isOutOfStockPopupOpen && isAdminUser && outOfStockItems.length > 0 && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-red-500 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-red-50/70">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md shadow-red-500/30 animate-pulse">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">Out of Stock Alert</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-600 text-white animate-pulse">
                        {outOfStockItems.length} Item{outOfStockItems.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {assignedWarehouse 
                        ? `The following materials are completely out of stock in ${assignedWarehouse}.`
                        : 'The following materials are completely out of stock across warehouses.'}
                    </p>
                  </div>
                </div>
                {/* Close 'X' Button */}
                <button 
                  onClick={() => setIsOutOfStockPopupOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  title="Close popup"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: Out of Stock List */}
              <div className="p-5 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2">Material / Product</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2 text-center">Available</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outOfStockItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-red-50/30 transition">
                        <td className="px-3 py-3 font-semibold text-gray-900">
                          {item.material?.name || 'Material Item'}
                        </td>
                        <td className="px-3 py-3 text-xs font-mono text-gray-500">
                          {item.material?.sku || '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md font-medium">
                            {item.store?.name || 'Main Warehouse'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-red-600">
                          0 {item.material?.baseUnit || 'Units'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                            OUT OF STOCK
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer with Close Button */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Total Out of Stock: <strong className="text-red-600 font-bold">{outOfStockItems.length}</strong> materials
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to="/inventory-list"
                    onClick={() => setIsOutOfStockPopupOpen(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
                  >
                    Go to Inventory List
                  </Link>
                  <button
                    onClick={() => setIsOutOfStockPopupOpen(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
