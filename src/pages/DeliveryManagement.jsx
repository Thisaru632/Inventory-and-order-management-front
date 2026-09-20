import React, { useState, useEffect } from 'react';
import { RefreshCcw, Truck, MapPin, CheckCircle, XCircle, Calendar, Star, MessageSquare, Eye, X, Package, FileText } from 'lucide-react';
import deliveryService from '../services/deliveryService';
import { getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const DeliveryManagement = () => {
  const assignedWarehouse = getAssignedWarehouse();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Delivery List');
  const [scheduleModalData, setScheduleModalData] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewingRecord, setViewingRecord] = useState(null);





  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDeliveries();
      if (res.success) {
        const data = res.data || [];
        const filtered = assignedWarehouse 
          ? data.filter(d => matchesWarehouse(d.store?.name, assignedWarehouse))
          : data;
        setDeliveries(filtered);
      }
    } catch (err) {
      console.warn("API Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleDeliverySuccess = () => {
    fetchDeliveries();
    window.dispatchEvent(new Event('inventory-updated'));
  };

  const handleMarkDelivered = async (id) => {
    if (!window.confirm('Mark this delivery as successfully delivered?')) return;
    try {
      await deliveryService.updateDeliveryStatus(id, 'DELIVERED');
      fetchDeliveries();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCancelDelivery = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this delivery? The stock will be returned to inventory.')) return;
    try {
      await deliveryService.cancelDelivery(id);
      fetchDeliveries();
      window.dispatchEvent(new Event('inventory-updated'));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel delivery');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading deliveries...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-2">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-emerald-600" /> Order and Delivery Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {assignedWarehouse ? `Dispatching and orders for ${assignedWarehouse}` : 'Dispatch stock to customer shops'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDeliveries}
            className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
            title="Refresh"
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-emerald-100 pb-3">
        <div className="inline-flex bg-emerald-50/70 p-1 rounded-xl border border-emerald-200/80 gap-1 text-xs sm:text-sm font-semibold shadow-xs">
          {['Delivery List', 'Order List'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all 
                ${activeTab === tab 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30' 
                  : 'text-gray-600 hover:text-emerald-800 hover:bg-white/80'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Delivery List' ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-emerald-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border-b border-emerald-200 text-xs text-emerald-950 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-bold text-emerald-950">Customer Shop</th>
                <th className="px-4 py-3 font-bold text-emerald-950">Material</th>
                <th className="px-4 py-3 font-bold text-emerald-950 text-right">Quantity</th>
                <th className="px-4 py-3 font-bold text-emerald-950">Delivery Date</th>
                <th className="px-4 py-3 font-bold text-emerald-950">Status</th>
                <th className="px-4 py-3 font-bold text-emerald-950">Customer Feedback</th>
                <th className="px-4 py-3 font-bold text-emerald-950 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliveries.filter(d => d.status !== 'PENDING').length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No deliveries scheduled yet.
                  </td>
                </tr>
              ) : (
                deliveries.filter(d => d.status !== 'PENDING').map((delivery) => (
                  <tr key={delivery._id} className="hover:bg-emerald-50/30 transition">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-bold text-gray-900">{delivery.customerShopName}</div>
                      {delivery.customerAddress && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-600" /> {delivery.customerAddress}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {delivery.items && delivery.items.length > 1 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                              {delivery.items.length} Items
                            </span>
                            <span className="text-xs text-gray-500">
                              From: {delivery.store?.name || 'Warehouse'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-800 space-y-0.5">
                            {delivery.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs gap-2">
                                <span className="font-semibold truncate max-w-[180px]">{it.material?.name || 'Material'}</span>
                                <span className="text-emerald-700 font-bold font-mono shrink-0">{it.quantity} {it.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-gray-900">{delivery.material?.name || delivery.items?.[0]?.material?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">From: {delivery.store?.name || 'Unknown'}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {delivery.items && delivery.items.length > 1 ? (
                        <div>
                          <div className="font-black text-emerald-800 text-sm">
                            {delivery.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)} Total
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">({delivery.items.length} materials)</div>
                        </div>
                      ) : (
                        <div className="font-black text-emerald-800">
                          {delivery.quantity || delivery.items?.[0]?.quantity || 1} <span className="text-emerald-600 text-xs ml-1 font-semibold">{delivery.unit || delivery.items?.[0]?.unit}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {delivery.scheduledDate ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs">
                          <Calendar size={12} className="text-emerald-600" />
                          {new Date(delivery.scheduledDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not specified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold 
                        ${delivery.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                          delivery.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                          delivery.status === 'DISPATCHED' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                          'bg-amber-100 text-amber-800'}`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {delivery.feedback && (delivery.feedback.productRating || delivery.feedback.sellerRating || delivery.feedback.comment) ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {delivery.feedback.productRating > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200" title={`Product Rating: ${delivery.feedback.productRating} / 5`}>
                                <Star size={11} className="fill-amber-400 text-amber-500" />
                                Prod: {delivery.feedback.productRating}★
                              </span>
                            )}
                            {delivery.feedback.sellerRating > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200" title={`Seller Rating: ${delivery.feedback.sellerRating} / 5`}>
                                <Star size={11} className="fill-teal-400 text-teal-500" />
                                Seller: {delivery.feedback.sellerRating}★
                              </span>
                            )}
                          </div>
                          {delivery.feedback.comment ? (
                            <div className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded-md border border-gray-100 max-w-xs break-words" title={delivery.feedback.comment}>
                              <span className="italic font-medium">"{delivery.feedback.comment}"</span>
                            </div>
                          ) : null}
                        </div>
                      ) : delivery.status === 'DELIVERED' ? (
                        <span className="text-xs text-gray-400 italic">No feedback yet</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-sm text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button 
                          onClick={() => setViewingRecord(delivery)}
                          className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                          title="View Record Details"
                        >
                          <Eye size={15} />
                        </button>
                        {(delivery.status === 'DISPATCHED' || delivery.status === 'PENDING') && (
                          <>
                            <button 
                              onClick={() => handleMarkDelivered(delivery._id)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition cursor-pointer"
                              title="Mark as Delivered"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleCancelDelivery(delivery._id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Cancel Delivery"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-emerald-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border-b border-emerald-200 text-xs text-emerald-950 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold text-emerald-950">Order ID</th>
                  <th className="px-4 py-3 font-bold text-emerald-950">Customer</th>
                  <th className="px-4 py-3 font-bold text-emerald-950">Product</th>
                  <th className="px-4 py-3 font-bold text-emerald-950">Delivery Date</th>
                  <th className="px-4 py-3 font-bold text-emerald-950">Status</th>
                  <th className="px-4 py-3 font-bold text-emerald-950 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.filter(d => d.status === 'PENDING').length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No pending orders found.
                    </td>
                  </tr>
                ) : (
                  deliveries.filter(d => d.status === 'PENDING').map((order) => (
                    <tr key={order._id} className="hover:bg-emerald-50/30 transition">
                      <td className="px-2 py-1 text-xs font-bold text-emerald-700 font-mono">DEL-{order._id.substring(order._id.length - 6).toUpperCase()}</td>
                      <td className="px-2 py-1 text-xs font-medium text-gray-800">
                        {order.customerShopName}
                      </td>
                      <td className="px-2 py-1 text-sm">
                        {order.items && order.items.length > 1 ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 text-[10px] font-bold">
                              <span>{order.items.length} Items in Order</span>
                            </div>
                            <div className="space-y-0.5 max-w-xs">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="font-medium text-gray-800 truncate max-w-[160px]">{it.material?.name || 'Material'}</span>
                                  <span className="text-emerald-700 font-bold ml-2 shrink-0">{it.quantity} {it.unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-gray-800">{order.material?.name || order.items?.[0]?.material?.name || 'Unknown Material'}</div>
                            <div className="text-xs text-emerald-700 font-semibold">Qty: {order.quantity || order.items?.[0]?.quantity || 1} {order.unit || order.items?.[0]?.unit}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-sm">
                        {order.scheduledDate ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs">
                            <Calendar size={12} className="text-emerald-600" />
                            {new Date(order.scheduledDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not specified</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold 
                          ${order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                            'bg-amber-100 text-amber-800'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-sm text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button 
                            onClick={() => setViewingRecord(order)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                            title="View Record Details"
                          >
                            <Eye size={15} />
                          </button>
                          {(order.status === 'PENDING' || order.status === 'DISPATCHED') && (
                            <>
                              <button 
                                onClick={() => handleCancelDelivery(order._id)}
                                className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
                              >
                                Reject
                              </button>
                              {order.status === 'PENDING' && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setScheduleModalData(order._id);
                                      if (order.scheduledDate) {
                                        try {
                                          setSelectedDate(new Date(order.scheduledDate).toISOString().split('T')[0]);
                                        } catch (e) {
                                          setSelectedDate('');
                                        }
                                      } else {
                                        setSelectedDate('');
                                      }
                                    }}
                                    className="px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                                  >
                                    Schedule
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      try {
                                        await deliveryService.updateDeliveryStatus(order._id, 'DISPATCHED');
                                        fetchDeliveries();
                                      } catch (err) {
                                        alert(err.response?.data?.error || err.response?.data?.message || 'Failed to dispatch order');
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-xs transition cursor-pointer"
                                  >
                                    Dispatch
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Schedule Delivery</h2>
            {(() => {
              const currentOrder = deliveries.find(d => d._id === scheduleModalData);
              return currentOrder ? (
                <div className="mb-4 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1 border border-gray-100">
                  <div><span className="font-semibold text-gray-700">Customer:</span> {currentOrder.customerShopName}</div>
                  {currentOrder.items && currentOrder.items.length > 1 ? (
                    <div>
                      <span className="font-semibold text-gray-700">Order Items ({currentOrder.items.length}):</span>
                      <ul className="mt-1 space-y-0.5 pl-2 list-disc text-[11px]">
                        {currentOrder.items.map((it, i) => (
                          <li key={i}>{it.material?.name || 'Material'}: <span className="font-semibold text-emerald-700">{it.quantity} {it.unit}</span></li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div><span className="font-semibold text-gray-700">Product:</span> {currentOrder.material?.name || currentOrder.items?.[0]?.material?.name} ({currentOrder.quantity || currentOrder.items?.[0]?.quantity} {currentOrder.unit || currentOrder.items?.[0]?.unit})</div>
                  )}
                </div>
              ) : null;
            })()}
            
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Delivery Date</label>
              <input 
                type="date" 
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  disabled={!selectedDate}
                  onClick={async () => {
                    try {
                      await deliveryService.updateDeliveryStatus(scheduleModalData, 'PENDING', selectedDate);
                      setScheduleModalData(null);
                      setSelectedDate('');
                      fetchDeliveries();
                    } catch (err) {
                      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to update delivery date');
                    }
                  }}
                  className="flex-1 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition border border-emerald-200 disabled:opacity-50"
                  title="Save scheduled delivery date without dispatching yet"
                >
                  Schedule Date Only
                </button>
                <button 
                  disabled={!selectedDate}
                  onClick={async () => {
                    try {
                      await deliveryService.updateDeliveryStatus(scheduleModalData, 'DISPATCHED', selectedDate);
                      setScheduleModalData(null);
                      setSelectedDate('');
                      fetchDeliveries();
                    } catch (err) {
                      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to schedule delivery');
                    }
                  }}
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-bold hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 shadow-sm"
                  title="Save date and dispatch immediately (deducts warehouse inventory)"
                >
                  Schedule & Dispatch
                </button>
              </div>
              <button 
                onClick={() => {
                  setScheduleModalData(null);
                  setSelectedDate('');
                }}
                className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <FileText size={18} className="text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight">Order & Delivery Details</h2>
                    <span className="font-mono text-[11px] bg-emerald-900/60 px-1.5 py-0.2 rounded text-emerald-200 font-bold">
                      DEL-{viewingRecord._id.substring(viewingRecord._id.length - 6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    Placed on {new Date(viewingRecord.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewingRecord(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Status and Warehouse Banner */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Status:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold 
                    ${viewingRecord.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                      viewingRecord.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                      viewingRecord.status === 'DISPATCHED' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                      'bg-amber-100 text-amber-800'}`}>
                    {viewingRecord.status}
                  </span>
                </div>
                <div className="text-gray-600">
                  <span className="text-gray-400 mr-1">Warehouse:</span>
                  <span className="font-bold text-gray-800">{viewingRecord.store?.name || 'All Warehouses'}</span>
                </div>
              </div>

              {/* Customer & Destination Card */}
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                  <MapPin size={14} className="text-emerald-600" />
                  <span>Customer & Delivery Destination</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Customer / Shop Name</span>
                    <span className="font-bold text-gray-900">{viewingRecord.customerShopName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Scheduled Delivery Date</span>
                    {viewingRecord.scheduledDate ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-0.5">
                        <Calendar size={12} />
                        {new Date(viewingRecord.scheduledDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not scheduled</span>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Delivery Address</span>
                    <span className="text-gray-700">{viewingRecord.customerAddress || 'Standard Registered Address'}</span>
                  </div>
                  {viewingRecord.notes && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Order Notes</span>
                      <span className="text-gray-600 italic">{viewingRecord.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items in Order */}
              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900">
                    <Package size={14} className="text-emerald-600" />
                    <span>Ordered Items ({(viewingRecord.items && viewingRecord.items.length > 0) ? viewingRecord.items.length : 1})</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {viewingRecord.items && viewingRecord.items.length > 0 
                      ? `${viewingRecord.items.reduce((s, it) => s + Number(it.quantity || 0), 0)} Total Units`
                      : `${viewingRecord.quantity || 1} ${viewingRecord.unit || ''}`
                    }
                  </span>
                </div>

                <div className="space-y-2 divide-y divide-gray-50 max-h-48 overflow-y-auto pr-1">
                  {(viewingRecord.items && viewingRecord.items.length > 0 ? viewingRecord.items : [viewingRecord]).map((item, idx) => (
                    <div key={idx} className={`flex items-center justify-between gap-2 ${idx > 0 ? 'pt-2' : ''}`}>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{item.material?.name || 'Material Item'}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          {item.material?.sku && <span className="font-mono bg-gray-100 px-1 py-0.2 rounded">{item.material.sku}</span>}
                          {item.store?.name && <span>Warehouse: {item.store.name}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-emerald-800 text-xs">
                          {item.quantity} <span className="text-gray-500 font-semibold">{item.unit || item.material?.baseUnit}</span>
                        </div>
                        {item.price > 0 && (
                          <div className="text-[10px] text-gray-400">
                            Rs. {(item.price * item.quantity).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Feedback (if delivered with review) */}
              {viewingRecord.feedback && (viewingRecord.feedback.productRating || viewingRecord.feedback.sellerRating || viewingRecord.feedback.comment) && (
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60 shadow-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Star size={14} className="fill-amber-400 text-amber-500" />
                    <span>Customer Rating & Feedback</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {viewingRecord.feedback.productRating > 0 && (
                      <span className="text-xs text-amber-800 font-semibold">
                        Product: {viewingRecord.feedback.productRating} / 5 ★
                      </span>
                    )}
                    {viewingRecord.feedback.sellerRating > 0 && (
                      <span className="text-xs text-teal-800 font-semibold">
                        Seller / Delivery: {viewingRecord.feedback.sellerRating} / 5 ★
                      </span>
                    )}
                  </div>
                  {viewingRecord.feedback.comment && (
                    <p className="text-xs text-gray-700 italic bg-white p-2 rounded-lg border border-amber-100">
                      "{viewingRecord.feedback.comment}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
              <button 
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium text-xs transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {viewingRecord.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        const rec = viewingRecord;
                        setViewingRecord(null);
                        setScheduleModalData(rec._id);
                        if (rec.scheduledDate) {
                          try {
                            setSelectedDate(new Date(rec.scheduledDate).toISOString().split('T')[0]);
                          } catch (e) {
                            setSelectedDate('');
                          }
                        }
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition cursor-pointer"
                    >
                      Schedule Date
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deliveryService.updateDeliveryStatus(viewingRecord._id, 'DISPATCHED');
                          setViewingRecord(null);
                          fetchDeliveries();
                        } catch (err) {
                          alert(err.response?.data?.error || err.response?.data?.message || 'Failed to dispatch order');
                        }
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Dispatch Now
                    </button>
                  </>
                )}

                {viewingRecord.status === 'DISPATCHED' && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Mark this delivery as successfully delivered?')) return;
                      try {
                        await deliveryService.updateDeliveryStatus(viewingRecord._id, 'DELIVERED');
                        setViewingRecord(null);
                        fetchDeliveries();
                      } catch (err) {
                        alert('Failed to update status');
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
