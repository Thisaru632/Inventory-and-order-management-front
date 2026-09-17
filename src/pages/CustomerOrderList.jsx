import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import deliveryService from '../services/deliveryService';

const CustomerOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDeliveries();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await deliveryService.cancelDelivery(id);
      fetchOrders();
    } catch (error) {
      alert('Failed to cancel order: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleMarkReceived = async (id) => {
    if (!window.confirm('Confirm that you have received this order?')) return;
    try {
      await deliveryService.updateDeliveryStatus(id, 'DELIVERED');
      fetchOrders();
    } catch (error) {
      alert('Failed to update order status');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Delivered': return <CheckCircle size={14} className="text-green-600" />;
      case 'Shipped': return <Truck size={14} className="text-blue-600" />;
      default: return <Clock size={14} className="text-yellow-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'DISPATCHED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your orders...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" /> Order List
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your recent orders</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Order ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Product Details</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-medium text-blue-600">DEL-{order._id.substring(order._id.length - 6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Package size={16} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{order.material?.name || 'Unknown Material'}</div>
                          <div className="text-xs text-gray-500">Qty: {order.quantity} {order.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === 'PENDING' && (
                        <button 
                          onClick={() => handleCancelOrder(order._id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                        >
                          Cancel
                        </button>
                      )}
                      {order.status === 'DISPATCHED' && (
                        <button 
                          onClick={() => handleMarkReceived(order._id)}
                          className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded transition"
                        >
                          Received
                        </button>
                      )}
                      {order.status !== 'PENDING' && order.status !== 'DISPATCHED' && (
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
    </div>
  );
};

export default CustomerOrderList;
