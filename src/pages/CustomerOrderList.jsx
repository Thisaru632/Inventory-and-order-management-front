import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, Truck, CheckCircle, Clock, Calendar, Star, X, MessageSquare } from 'lucide-react';
import deliveryService from '../services/deliveryService';
import { getCurrentUser } from '../utils/auth';

const CustomerOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feedback modal state
  const [feedbackModalOrder, setFeedbackModalOrder] = useState(null);
  const [productRating, setProductRating] = useState(5);
  const [sellerRating, setSellerRating] = useState(5);
  const [hoverProductRating, setHoverProductRating] = useState(0);
  const [hoverSellerRating, setHoverSellerRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const currentUser = getCurrentUser();
      const res = await deliveryService.getDeliveries();
      if (res.success) {
        const allOrders = res.data || [];
        // Filter strictly to current customer's own orders
        const myOrders = allOrders.filter(order => {
          if (!currentUser) return false;

          const userId = (currentUser.id || currentUser._id || '').toString();
          if (order.customer && userId) {
            const orderCustomerId = (order.customer?._id || order.customer || '').toString();
            if (orderCustomerId === userId) return true;
          }

          const shopName = (order.customerShopName || '').trim().toLowerCase();
          const userName = (currentUser.name || '').trim().toLowerCase();
          const userEmail = (currentUser.email || '').trim().toLowerCase();
          const emailPrefix = userEmail ? userEmail.split('@')[0] : '';

          // Match by name or email or username prefix
          if (userName && shopName === userName) return true;
          if (userEmail && shopName === userEmail) return true;
          if (emailPrefix && shopName === emailPrefix) return true;

          // Match by registered address if placed via customer portal
          if (currentUser.address && currentUser.address.trim().length > 5 && order.customerAddress) {
            const userAddr = currentUser.address.trim().toLowerCase().replace(/\s+/g, ' ');
            const orderAddr = order.customerAddress.trim().toLowerCase().replace(/\s+/g, ' ');
            if (userAddr === orderAddr && order.notes?.includes('Customer Portal')) {
              return true;
            }
          }

          return false;
        });

        setOrders(myOrders);
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
                <th className="px-6 py-4 font-semibold text-gray-700">Order Date</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Delivery Date</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Product Details</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-medium text-blue-600">DEL-{order._id.substring(order._id.length - 6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {order.scheduledDate ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                          <Calendar size={12} className="text-blue-500" />
                          {new Date(order.scheduledDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not scheduled</span>
                      )}
                    </td>
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
                      {order.status === 'DELIVERED' && order.feedback && (order.feedback.productRating || order.feedback.sellerRating) ? (
                        <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-1">
                          <Star size={11} className="fill-amber-400 text-amber-500" />
                          <span>Product: {order.feedback.productRating}/5 • Seller: {order.feedback.sellerRating}/5</span>
                        </div>
                      ) : null}
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
                          onClick={() => {
                            setFeedbackModalOrder(order);
                            setProductRating(5);
                            setSellerRating(5);
                            setHoverProductRating(0);
                            setHoverSellerRating(0);
                            setFeedbackComment('');
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition shadow-sm inline-flex items-center gap-1"
                        >
                          <CheckCircle size={13} />
                          Received
                        </button>
                      )}
                      {order.status === 'DELIVERED' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                          <CheckCircle size={14} /> Completed
                        </span>
                      )}
                      {order.status === 'CANCELLED' && (
                        <span className="text-gray-400 text-xs italic">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Receipt Confirmation & Feedback Modal */}
      {feedbackModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirm Order Received</h3>
                  <p className="text-xs text-gray-600">Rate the product and seller service</p>
                </div>
              </div>
              <button 
                onClick={() => setFeedbackModalOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-sm">
              {/* Order Info Summary */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase">Product Details</p>
                  <p className="font-bold text-gray-900 mt-0.5">{feedbackModalOrder.material?.name || 'Item'}</p>
                  <p className="text-xs text-gray-500">Qty: {feedbackModalOrder.quantity} {feedbackModalOrder.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    DEL-{feedbackModalOrder._id.substring(feedbackModalOrder._id.length - 6).toUpperCase()}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-1">{feedbackModalOrder.store?.name || 'Warehouse'}</p>
                </div>
              </div>

              {/* Product Star Rating */}
              <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/40 border border-amber-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    Product Quality Rating
                  </label>
                  <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    {hoverProductRating || productRating} / 5 Stars
                  </span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverProductRating || productRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setProductRating(star)}
                        onMouseEnter={() => setHoverProductRating(star)}
                        onMouseLeave={() => setHoverProductRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star 
                          size={26} 
                          className={active ? 'fill-amber-400 text-amber-500 drop-shadow-sm' : 'text-gray-300'} 
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seller & Delivery Star Rating */}
              <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/40 border border-blue-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-500" />
                    Seller & Delivery Rating
                  </label>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    {hoverSellerRating || sellerRating} / 5 Stars
                  </span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverSellerRating || sellerRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSellerRating(star)}
                        onMouseEnter={() => setHoverSellerRating(star)}
                        onMouseLeave={() => setHoverSellerRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star 
                          size={26} 
                          className={active ? 'fill-blue-500 text-blue-600 drop-shadow-sm' : 'text-gray-300'} 
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Comment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-gray-500" />
                  Your Feedback / Comment (Optional)
                </label>
                <textarea
                  rows="3"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us about the condition of the material, packaging, and delivery speed..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-800 resize-none font-medium"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmittingFeedback}
                onClick={() => setFeedbackModalOrder(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingFeedback}
                onClick={async () => {
                  setIsSubmittingFeedback(true);
                  try {
                    await deliveryService.updateDeliveryStatus(
                      feedbackModalOrder._id, 
                      'DELIVERED', 
                      null, 
                      {
                        productRating,
                        sellerRating,
                        comment: feedbackComment
                      }
                    );
                    setFeedbackModalOrder(null);
                    fetchOrders();
                    alert('Order confirmed as received with your feedback. Thank you!');
                  } catch (err) {
                    alert(err.response?.data?.error || err.response?.data?.message || 'Failed to submit feedback');
                  } finally {
                    setIsSubmittingFeedback(false);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                {isSubmittingFeedback ? 'Submitting...' : 'Confirm Received & Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderList;
