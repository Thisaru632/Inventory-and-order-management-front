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
      case 'Delivered': return <CheckCircle size={14} className="text-emerald-600" />;
      case 'Shipped': return <Truck size={14} className="text-teal-600" />;
      default: return <Clock size={14} className="text-amber-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-800';
      case 'DISPATCHED': return 'bg-teal-100 text-teal-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your orders...</div>;

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3 sm:space-y-4">
      <div className="flex justify-between items-center bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl shadow-xs">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Order List</h1>
            <p className="text-gray-500 text-xs mt-0.5">Track and manage your orders</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-emerald-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border-b border-emerald-200 text-[11px] text-emerald-950 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 font-bold text-emerald-950">Order ID</th>
                <th className="px-3.5 py-2.5 font-bold text-emerald-950">Order Date</th>
                <th className="px-3.5 py-2.5 font-bold text-emerald-950">Delivery Date</th>
                <th className="px-3.5 py-2.5 font-bold text-emerald-950">Product Details</th>
                <th className="px-3.5 py-2.5 font-bold text-emerald-950">Status</th>
                <th className="px-3.5 py-2.5 font-bold text-emerald-950 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-xs">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-emerald-50/30 transition">
                    <td className="px-3.5 py-2.5 font-bold text-emerald-800 font-mono text-xs">DEL-{order._id.substring(order._id.length - 6).toUpperCase()}</td>
                    <td className="px-3.5 py-2.5 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-3.5 py-2.5">
                      {order.scheduledDate ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs">
                          <Calendar size={11} className="text-emerald-600" />
                          {new Date(order.scheduledDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {order.items && order.items.length > 1 ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md shrink-0">
                              <Package size={13} />
                            </div>
                            <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {order.items.length} Items in this Order
                            </span>
                          </div>
                          <div className="space-y-1 pl-1">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs gap-3">
                                <span className="font-medium text-gray-800 truncate max-w-[200px]">{it.material?.name || 'Material'}</span>
                                <span className="text-emerald-700 font-bold shrink-0">{it.quantity} {it.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg shrink-0">
                            <Package size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 truncate">{order.material?.name || order.items?.[0]?.material?.name || 'Unknown Material'}</div>
                            <div className="text-[11px] text-emerald-700 font-semibold">Qty: {order.quantity || order.items?.[0]?.quantity || 1} {order.unit || order.items?.[0]?.unit}</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                      {order.status === 'DELIVERED' && order.feedback && (order.feedback.productRating || order.feedback.sellerRating) ? (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold mt-0.5">
                          <Star size={10} className="fill-amber-400 text-amber-500" />
                          <span>P: {order.feedback.productRating}/5 • S: {order.feedback.sellerRating}/5</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {order.status === 'PENDING' && (
                        <button 
                          onClick={() => handleCancelOrder(order._id)}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
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
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition shadow-md shadow-emerald-500/20 inline-flex items-center gap-1.5"
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
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
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
              <div className="space-y-1.5 p-3 rounded-xl bg-teal-50/40 border border-teal-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Truck size={14} className="text-teal-600" />
                    Seller & Delivery Rating
                  </label>
                  <span className="text-xs font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
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
                          className={active ? 'fill-teal-500 text-teal-600 drop-shadow-sm' : 'text-gray-300'} 
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
