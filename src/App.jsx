import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import InventoryDashboard from './pages/InventoryDashboard';
import InventoryList from './pages/InventoryList';
import DeliveryManagement from './pages/DeliveryManagement';
import CustomerItemList from './pages/CustomerItemList';
import CustomerOrderList from './pages/CustomerOrderList';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import WarehouseManagement from './pages/WarehouseManagement';
import TransactionAuditLog from './components/TransactionAuditLog';
import Login from './pages/Login';
import { LayoutDashboard, History, List, Truck, Users, ChevronDown, ChevronRight, ShoppingBag, Package, UserCog, BarChart3, Building, Bell, AlertCircle, LogOut } from 'lucide-react';
import inventoryService from './services/inventoryService';

function App() {
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  };

  const checkStockAlerts = async () => {
    try {
      const res = await inventoryService.getStoreStock();
      if (res.success && res.data && res.data.length > 0) {
        const outOfStock = res.data.filter(item => item.quantityInBaseUnit <= 0);
        setOutOfStockItems(outOfStock);
      } else {
        setOutOfStockItems([]);
      }
    } catch (err) {
      setOutOfStockItems([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkStockAlerts();
      window.addEventListener('inventory-updated', checkStockAlerts);
      return () => window.removeEventListener('inventory-updated', checkStockAlerts);
    }
  }, [isAuthenticated]);

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
            
            {/* User Management */}
            <Link 
              to="/users" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
            >
              <UserCog size={18} />
              User Management
            </Link>
            
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 shadow-sm z-20">
            <div className="flex-1"></div>
            <div className="flex items-center gap-6">
              
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                >
                  <Bell size={20} />
                  {outOfStockItems.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Notifications</h3>
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {outOfStockItems.length} New
                      </span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {outOfStockItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          All caught up! No active alerts.
                        </div>
                      ) : (
                        outOfStockItems.map((item, idx) => (
                          <div key={idx} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition flex items-start gap-3">
                            <div className="mt-0.5 text-red-500 bg-red-50 p-1.5 rounded-full">
                              <AlertCircle size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Out of Stock: {item.material?.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Product Code: <span className="font-semibold text-gray-700">{item.material?.sku}</span>
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
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
              <Route path="/" element={<InventoryDashboard />} />
              <Route path="/inventory-list" element={<InventoryList />} />
              <Route path="/deliveries" element={<DeliveryManagement />} />
              <Route path="/audit-log" element={<TransactionAuditLog />} />
              <Route path="/customer/items" element={<CustomerItemList />} />
              <Route path="/customer/orders" element={<CustomerOrderList />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/warehouse" element={<WarehouseManagement />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
