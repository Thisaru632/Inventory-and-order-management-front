import React, { useState, useEffect } from 'react';
import { RefreshCcw, Truck, MapPin, CheckCircle, XCircle } from 'lucide-react';
import deliveryService from '../services/deliveryService';

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Delivery List');
  const [scheduleModalData, setScheduleModalData] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');



  const mockAdminOrders = [
    {
      id: "ORD-9872",
      customer: "Perera Hardware",
      product: "Premium Steel Beams",
      quantity: 2,
      total: 499.98,
      status: "Pending"
    },
    {
      id: "ORD-9873",
      customer: "Silva Workshop",
      product: "Copper Wiring Bundle",
      quantity: 5,
      total: 21.25,
      status: "Processing"
    },
    {
      id: "ORD-9874",
      customer: "Colombo Construction",
      product: "Cement Bags",
      quantity: 100,
      total: 1200.00,
      status: "Shipped"
    }
  ];

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDeliveries();
      if (res.success) {
        setDeliveries(res.data);
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
            <Truck className="text-blue-600" /> Order and Delivery Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Dispatch stock to customer shops</p>
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
      <div className="flex border-b border-gray-200">
        {['Delivery List', 'Order List'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-1 text-sm text-xs font-medium transition-colors border-b-2 
              ${activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Delivery List' ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Customer Shop</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Material</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-right">Quantity</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700">Status</th>
                <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliveries.filter(d => d.status !== 'PENDING').length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No deliveries scheduled yet.
                  </td>
                </tr>
              ) : (
                deliveries.filter(d => d.status !== 'PENDING').map((delivery) => (
                  <tr key={delivery._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-2 py-1 text-sm">
                      <div className="font-medium text-gray-800">{delivery.customerShopName}</div>
                      {delivery.customerAddress && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin size={12} /> {delivery.customerAddress}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1 text-sm">
                      <div className="font-medium text-gray-800">{delivery.material?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 mt-1">From: {delivery.store?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-2 py-1 text-sm text-right font-medium text-blue-600">
                      {delivery.quantity} <span className="text-blue-300 text-xs ml-1">{delivery.unit}</span>
                    </td>
                    <td className="px-2 py-1 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium 
                        ${delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                          delivery.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-sm text-right">
                      {delivery.status === 'DISPATCHED' || delivery.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleMarkDelivered(delivery._id)}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                            title="Mark as Delivered"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={() => handleCancelDelivery(delivery._id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Cancel Delivery"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1 text-sm font-semibold text-gray-700">Order ID</th>
                  <th className="px-2 py-1 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-2 py-1 text-sm font-semibold text-gray-700">Product</th>
                  <th className="px-2 py-1 text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-2 py-1 text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-2 py-1 text-sm font-semibold text-gray-700 text-right">Actions</th>
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
                    <tr key={order._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-2 py-1 text-xs font-medium text-blue-600">DEL-{order._id.substring(order._id.length - 6).toUpperCase()}</td>
                      <td className="px-2 py-1 text-xs font-medium text-gray-800">
                        {order.customerShopName}
                        {order.scheduledDate && (
                          <div className="text-xs text-purple-600 mt-1">
                            Scheduled: {new Date(order.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-sm">
                        <div className="font-medium text-gray-800">{order.material?.name || 'Unknown Material'}</div>
                        <div className="text-xs text-gray-500">Qty: {order.quantity} {order.unit}</div>
                      </td>
                      <td className="px-2 py-1 text-sm font-bold text-gray-900">-</td>
                      <td className="px-2 py-1 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
                          ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-sm text-right">
                        {(order.status === 'PENDING' || order.status === 'DISPATCHED') ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleCancelDelivery(order._id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                            >
                              Reject
                            </button>
                            {order.status === 'PENDING' && (
                              <>
                                <button 
                                  onClick={() => setScheduleModalData(order._id)}
                                  className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition"
                                >
                                  Schedule
                                </button>
                                <button 
                                  onClick={async () => {
                                    try {
                                      await deliveryService.updateDeliveryStatus(order._id, 'DISPATCHED');
                                      fetchDeliveries();
                                    } catch (err) {
                                      alert('Failed to dispatch order');
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition"
                                >
                                  Dispatch
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No actions</span>
                        )}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-3">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Schedule Delivery</h2>
            
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Delivery Date</label>
              <input 
                type="date" 
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setScheduleModalData(null);
                  setSelectedDate('');
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
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
                    alert('Failed to schedule delivery');
                  }
                }}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
              >
                Schedule & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
