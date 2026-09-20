import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  List,
  Truck,
  History,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
  UserCog,
  UserCheck,
  BarChart3,
  Building
} from 'lucide-react';
import {
  isSuperAdmin,
  isCustomer,
  isAdmin,
  isCashier
} from '../utils/auth';

export default function Sidebar({
  user,
  orderNotifications = [],
  outOfStockItems = [],
  isCustomerPortalOpen,
  setIsCustomerPortalOpen
}) {
  const location = useLocation();

  const isSuper = isSuperAdmin(user);
  const isCust = isCustomer(user);
  const isCashierUser = isCashier(user);
  const isAdminUser = isSuper || isAdmin(user);

  // Determine if the current view should default to compressed
  const shouldDefaultCollapsed = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isCustomerSection = isCust || location.pathname.startsWith('/customer/');
    return isMobile || isCustomerSection;
  };

  const [isCollapsed, setIsCollapsed] = useState(shouldDefaultCollapsed);

  // Automatically update collapsed state on window resize and route changes
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const isCustomerSection = isCust || location.pathname.startsWith('/customer/');
      if (isMobile || isCustomerSection) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname, isCust]);

  // Counts for alert badges
  const pendingOrdersCount = Array.isArray(orderNotifications) ? orderNotifications.length : 0;
  const outOfStockCount = Array.isArray(outOfStockItems) ? outOfStockItems.length : 0;

  const renderLink = (to, icon, label, badge = null, exact = false) => {
    const isActive = exact
      ? location.pathname === to
      : (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

    if (isCollapsed) {
      return (
        <Link
          to={to}
          title={label}
          className={`relative flex items-center justify-center w-8 h-8 mx-auto rounded-lg text-xs transition-all duration-150 group ${
            isActive
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-bold'
              : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {icon}
          {badge && (
            <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 bg-red-500 text-white rounded-full text-[8px] font-extrabold flex items-center justify-center leading-none">
              {typeof badge === 'object' ? '•' : badge}
            </span>
          )}
        </Link>
      );
    }

    return (
      <Link
        to={to}
        className={`relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 group ${
          isActive
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-xs'
            : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-emerald-50/70 hover:translate-x-0.5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1 rounded-md transition-all ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'
            }`}
          >
            {icon}
          </div>
          <span className="truncate text-xs">{label}</span>
        </div>
        {badge}
      </Link>
    );
  };

  const renderSectionHeader = (title) => {
    if (isCollapsed) {
      return <div className="h-px w-5 bg-slate-200/80 mx-auto my-1.5" title={title} />;
    }

    return (
      <div className="pt-2.5 pb-1 px-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
            {title}
          </span>
          <div className="flex-1 h-px bg-slate-200/60" />
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-14' : 'w-56'
      } bg-white border-r border-slate-200/80 flex-shrink-0 flex flex-col h-screen sticky top-0 z-30 select-none transition-all duration-200`}
    >
      {/* Brand Header */}
      {isCollapsed ? (
        <div className="h-14 flex flex-col items-center justify-center border-b border-slate-100 shrink-0 bg-gradient-to-b from-white to-emerald-50/20 relative">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs hover:scale-105 transition"
            title="Expand sidebar"
          >
            <Receipt size={14} className="stroke-[2.2]" />
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-2 top-4 w-4 h-6 bg-white border border-slate-200 rounded-r-md flex items-center justify-center text-slate-400 hover:text-emerald-700 shadow-xs transition z-40"
            title="Expand sidebar"
          >
            <ChevronRight size={11} />
          </button>
        </div>
      ) : (
        <div className="h-14 px-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-white via-emerald-50/20 to-teal-50/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Receipt size={14} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="text-xs font-extrabold tracking-tight text-slate-900 leading-none truncate">
                  Tool Link
                </h1>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] font-bold tracking-wider text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded uppercase leading-none">
                  {isCust ? 'Store' : 'ERP'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition shrink-0"
            title="Compress sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      )}

      {/* Navigation Content */}
      <nav className={`flex-1 ${isCollapsed ? 'px-1.5' : 'px-2.5'} py-2 space-y-0.5 overflow-y-auto custom-scrollbar`}>
        {/* Customer Portal Navigation */}
        {isCust ? (
          <>
            {renderSectionHeader('Customer Store')}
            {renderLink('/customer/items', <Package size={14} />, 'Product Catalog')}
            {renderLink('/customer/orders', <ShoppingBag size={14} />, 'My Orders')}

            {renderSectionHeader('My Account')}
            {renderLink('/customer/profile', <UserCog size={14} />, 'My Profile')}
          </>
        ) : isCashierUser ? (
          /* Cashier Navigation */
          <>
            {renderSectionHeader('Cashier Desk')}
            {renderLink(
              '/cashier',
              <Receipt size={14} />,
              'Cashier Portal',
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase transition-colors ${
                  location.pathname === '/cashier'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                POS
              </span>
            )}

            {renderSectionHeader('Operations')}
            {renderLink(
              '/inventory-list',
              <List size={14} />,
              'Inventory List',
              outOfStockCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {outOfStockCount}
                </span>
              ) : null
            )}
            {renderLink(
              '/deliveries',
              <Truck size={14} />,
              'Delivery & Orders',
              pendingOrdersCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500 text-white shadow-xs animate-pulse">
                  {pendingOrdersCount}
                </span>
              ) : null
            )}
          </>
        ) : (
          /* Admin / Super Admin / Warehouse Staff Navigation */
          <>
            {renderSectionHeader('Core Operations')}
            {renderLink('/', <LayoutDashboard size={14} />, 'Dashboard', null, true)}
            {renderLink(
              '/cashier',
              <Receipt size={14} />,
              'Cashier Portal',
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase transition-colors ${
                  location.pathname === '/cashier'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                POS
              </span>
            )}
            {renderLink(
              '/inventory-list',
              <List size={14} />,
              'Inventory List',
              outOfStockCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {outOfStockCount}
                </span>
              ) : null
            )}
            {renderLink(
              '/deliveries',
              <Truck size={14} />,
              'Delivery & Orders',
              pendingOrdersCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500 text-white shadow-xs animate-pulse">
                  {pendingOrdersCount}
                </span>
              ) : null
            )}
            {renderLink('/audit-log', <History size={14} />, 'Audit Log')}

            {renderSectionHeader('Commerce & Clients')}
            {/* Customer Portal Accordion or Icon */}
            {isCollapsed ? (
              renderLink('/customer/items', <Users size={14} />, 'Customer Portal')
            ) : (
              <div>
                <button
                  onClick={() => setIsCustomerPortalOpen(!isCustomerPortalOpen)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                    location.pathname.startsWith('/customer/')
                      ? 'text-emerald-900 bg-emerald-50/90 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50/70 hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1 rounded-md transition-all ${
                        location.pathname.startsWith('/customer/')
                          ? 'bg-emerald-200/80 text-emerald-800'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                      }`}
                    >
                      <Users size={14} />
                    </div>
                    <span>Customer Portal</span>
                  </div>
                  <div
                    className={`text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                      isCustomerPortalOpen ? 'rotate-180 text-emerald-700' : ''
                    }`}
                  >
                    <ChevronDown size={13} />
                  </div>
                </button>

                {isCustomerPortalOpen && (
                  <div className="ml-3.5 pl-2.5 border-l border-emerald-200/80 space-y-0.5 my-1">
                    <Link
                      to="/customer/items"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        location.pathname === '/customer/items'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/70'
                      }`}
                    >
                      <Package size={12} />
                      <span>Item Catalog</span>
                    </Link>
                    <Link
                      to="/customer/orders"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        location.pathname === '/customer/orders'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/70'
                      }`}
                    >
                      <ShoppingBag size={12} />
                      <span>Order History</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {isAdminUser &&
              renderLink('/customer-users', <UserCheck size={14} />, 'Customer Directory')}

            {renderSectionHeader('Administration')}
            {isAdminUser &&
              renderLink('/users', <UserCog size={14} />, 'User Management')}
            {renderLink('/reports', <BarChart3 size={14} />, 'Reports & Analytics')}
            {renderLink('/warehouse', <Building size={14} />, 'Warehouse Network')}
          </>
        )}
      </nav>

      {/* Footer Toggle Button */}
      <div className="p-1.5 border-t border-slate-100 flex justify-center shrink-0 bg-slate-50/40">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
          title={isCollapsed ? 'Expand sidebar' : 'Compress sidebar'}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>
    </aside>
  );
}
