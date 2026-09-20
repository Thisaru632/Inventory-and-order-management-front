import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Filter, ShoppingBag, X, MapPin, Phone, 
  Calendar, Trash2, Plus, Minus, Check, ArrowRight 
} from 'lucide-react';
import inventoryService from '../services/inventoryService';
import deliveryService from '../services/deliveryService';

const CustomerItemList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Auto-get logged in customer registration details
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const cartStorageKey = currentUser?.id || currentUser?._id 
    ? `customer_cart_${currentUser.id || currentUser._id}` 
    : 'customer_cart_default';

  // Load cart from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(newCart));
    } catch (e) {}
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2400);
  };

  const addToCart = (product, quantityToAdd = 1) => {
    if (!product || product.availableQuantity <= 0) {
      showToast('Product is currently out of stock');
      return;
    }

    const existingIdx = cart.findIndex(item => item._id === product._id);
    let newCart = [...cart];

    if (existingIdx > -1) {
      const currentQty = newCart[existingIdx].quantity;
      const targetQty = Math.min(product.availableQuantity, currentQty + quantityToAdd);
      if (currentQty >= product.availableQuantity) {
        showToast(`Max available stock reached (${product.availableQuantity})`);
        return;
      }
      newCart[existingIdx] = {
        ...newCart[existingIdx],
        quantity: targetQty
      };
      saveCart(newCart);
      showToast(`Updated ${product.material?.name}: ${targetQty} in cart`);
    } else {
      newCart.push({
        _id: product._id,
        material: product.material,
        store: product.store,
        price: product.price,
        image: product.image,
        quantity: Math.min(product.availableQuantity, quantityToAdd),
        maxQuantity: product.availableQuantity,
        unit: product.material?.baseUnit || 'unit'
      });
      saveCart(newCart);
      showToast(`Added ${product.material?.name} to cart`);
    }
  };

  const updateCartQuantity = (productId, newQty) => {
    const newCart = cart.map(item => {
      if (item._id === productId) {
        const clamped = Math.max(1, Math.min(item.maxQuantity, newQty));
        return { ...item, quantity: clamped };
      }
      return item;
    });
    saveCart(newCart);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item._id !== productId);
    saveCart(newCart);
    showToast('Item removed from cart');
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear your cart?')) {
      saveCart([]);
      showToast('Cart cleared');
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartUniqueItems = cart.length;
  const cartGrandTotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * item.quantity), 0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getStoreStock();
      if (res.success && res.data.length > 0) {
        const mappedData = res.data.map((item) => ({
          ...item,
          price: item.unitSellingPrice || 0,
          image: item.imageUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80"
        }));
        setProducts(mappedData);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.warn("API Error:", err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.material?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.material?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlaceCartOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (!deliveryDate) {
      alert('Please select a delivery date');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderName = currentUser.name || currentUser.email?.split('@')[0] || 'Customer';
      const orderAddress = currentUser.address || 'Customer Registered Address';

      const orderPayload = {
        customerShopName: orderName,
        customerAddress: orderAddress,
        scheduledDate: deliveryDate,
        notes: 'Ordered via Customer Portal (Cart)',
        items: cart.map(item => ({
          storeId: item.store?._id,
          materialId: item.material?._id,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price
        }))
      };

      const res = await deliveryService.createDelivery(orderPayload);

      // Dispatch event for real-time notification
      window.dispatchEvent(new CustomEvent('new-customer-order', { detail: res?.data }));
      try {
        localStorage.setItem('last_customer_order_time', Date.now().toString());
      } catch (e) {}

      saveCart([]);
      setIsCartOpen(false);
      alert(`Order placed successfully for ${cart.length} item(s)!`);
      fetchProducts();
    } catch (err) {
      alert('Failed to place order: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-sm text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-emerald-500/30 transition-all">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Storefront Header */}
      <div className="bg-white border-b border-emerald-100 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl shadow-xs">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
                  Product Catalog
                </h1>
                <p className="text-gray-500 text-xs mt-0.5">Browse materials and add multiple items to your cart.</p>
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-emerald-200 bg-emerald-50/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white w-full text-xs transition"
                />
              </div>

              <button className="p-1.5 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition shrink-0">
                <Filter size={14} />
              </button>

              {/* Shopping Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-xs shadow-xs transition shrink-0 cursor-pointer"
                title="View Shopping Cart"
              >
                <ShoppingCart size={15} />
                <span className="hidden sm:inline">Cart</span>
                {totalCartCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full leading-none">
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-xs">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">No products found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find(c => c._id === product._id);
              const isOutOfStock = product.availableQuantity <= 0;

              return (
                <div key={product._id} className="bg-white rounded-xl shadow-xs border border-emerald-100 overflow-hidden hover:shadow-md hover:border-emerald-300 transition-all duration-200 group flex flex-col">
                  <div className="relative h-28 sm:h-32 overflow-hidden bg-gray-100">
                    <img 
                      src={product.image} 
                      alt={product.material?.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isOutOfStock ? (
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Out of Stock
                      </div>
                    ) : product.availableQuantity <= 10 ? (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Low Stock: {product.availableQuantity}
                      </div>
                    ) : null}

                    {inCartItem && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <Check size={10} />
                        {inCartItem.quantity} in cart
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2.5 sm:p-3 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                      <div className="text-[9px] text-emerald-700 font-mono font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {product.material?.sku}
                      </div>
                      {product.store && (
                        <div className="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded-full font-bold truncate max-w-[80px]">
                          {product.store.name}
                        </div>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 line-clamp-2 leading-snug group-hover:text-emerald-950 transition">
                      {product.material?.name}
                    </h3>
                    
                    <div className="mt-auto pt-2 flex items-end justify-between">
                      <div>
                        <div className="text-sm sm:text-base font-black text-emerald-900 leading-none">
                          Rs. {Number(product.price).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                          per {product.material?.baseUnit}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons: Add to Cart + Direct Buy */}
                    <div className="mt-2.5 flex gap-1.5">
                      <button 
                        onClick={() => addToCart(product, 1)}
                        disabled={isOutOfStock}
                        className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer border ${
                          inCartItem 
                            ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 hover:bg-emerald-200/70' 
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Add to Cart"
                      >
                        <Plus size={12} className="text-emerald-700" />
                        <span>{inCartItem ? `Add (${inCartItem.quantity})` : 'Add to Cart'}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setSelectedProduct(product);
                          setOrderQuantity(1);
                        }}
                        disabled={isOutOfStock}
                        className="py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Quick View & Direct Buy"
                      >
                        <ShoppingBag size={12} />
                        <span className="hidden sm:inline">Buy</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Pill (Visible when cart has items) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-full font-bold text-xs shadow-xl shadow-emerald-700/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-emerald-400/40"
          >
            <div className="relative">
              <ShoppingCart size={16} />
              <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {totalCartCount}
              </span>
            </div>
            <span>View Cart ({totalCartUniqueItems})</span>
            <span className="font-extrabold text-emerald-200">
              • Rs. {cartGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <ArrowRight size={13} className="text-emerald-300" />
          </button>
        </div>
      )}

      {/* Cart Slide-over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
          />
          
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Cart Drawer Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-200" />
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">Shopping Cart</h2>
                    <p className="text-[11px] text-emerald-100">
                      {totalCartUniqueItems} item{totalCartUniqueItems === 1 ? '' : 's'} ({totalCartCount} total units)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-[11px] bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 hover:text-white px-2 py-1 rounded-md transition cursor-pointer"
                      title="Clear Cart"
                    >
                      Clear
                    </button>
                  )}
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-1 text-emerald-100 hover:text-white rounded-lg hover:bg-emerald-800/60 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Cart Items Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                      <ShoppingCart size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">Your cart is empty</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Browse materials from the catalog and click "Add to Cart" to select multiple items and place a combined delivery order.
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                    >
                      Browse Materials
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Item Cards */}
                    <div className="space-y-2.5">
                      {cart.map((item) => (
                        <div 
                          key={item._id}
                          className="flex gap-2.5 p-2.5 bg-white rounded-xl border border-emerald-100 shadow-xs hover:border-emerald-200 transition"
                        >
                          <img 
                            src={item.image} 
                            alt={item.material?.name} 
                            className="w-14 h-14 object-cover rounded-lg border border-gray-100 bg-gray-50 shrink-0" 
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="text-xs font-bold text-gray-900 truncate">{item.material?.name}</h4>
                                <button
                                  onClick={() => removeFromCart(item._id)}
                                  className="text-gray-400 hover:text-red-500 transition p-0.5 cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                                <span className="font-mono">{item.material?.sku}</span>
                                {item.store && (
                                  <span className="bg-teal-50 text-teal-700 px-1 py-0.2 rounded border border-teal-100 truncate max-w-[90px]">
                                    {item.store.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                              {/* Stepper */}
                              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                <button
                                  onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-40 cursor-pointer"
                                >
                                  <Minus size={10} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.maxQuantity}
                                  value={item.quantity}
                                  onChange={(e) => updateCartQuantity(item._id, Number(e.target.value) || 1)}
                                  className="w-10 text-center text-xs font-bold bg-white py-0.5 border-x border-gray-200 focus:outline-none"
                                />
                                <button
                                  onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                                  disabled={item.quantity >= item.maxQuantity}
                                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-40 cursor-pointer"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>

                              <div className="text-right">
                                <div className="text-xs font-black text-emerald-900">
                                  Rs. {(Number(item.price) * item.quantity).toLocaleString()}
                                </div>
                                <div className="text-[9px] text-gray-400">
                                  Rs. {Number(item.price).toLocaleString()} / {item.unit}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Date Selection */}
                    <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                      <label className="block text-xs font-bold text-gray-800 uppercase mb-1.5 flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-700" />
                        Select Delivery Date *
                      </label>
                      <input 
                        type="date"
                        min={todayStr}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-xs text-gray-800 bg-white"
                      />
                    </div>

                    {/* Delivery Address Details */}
                    <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs shadow-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                        <MapPin size={13} className="text-emerald-600" />
                        <span>Delivery Address (Registration Details)</span>
                      </div>
                      <p className="font-bold text-gray-900">{currentUser.name || currentUser.email?.split('@')[0] || 'Customer'}</p>
                      <p className="text-gray-600 mt-0.5">{currentUser.address || 'Standard Registered Delivery'}</p>
                      {currentUser.phone && (
                        <p className="text-gray-500 mt-0.5 flex items-center gap-1">
                          <Phone size={11} /> {currentUser.phone}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Cart Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-600 font-medium">Grand Total ({totalCartCount} units)</span>
                    <span className="text-lg font-black text-emerald-950">
                      Rs. {cartGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <button
                    disabled={isPlacingOrder || cart.length === 0}
                    onClick={handlePlaceCartOrder}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <ShoppingBag size={14} />
                    {isPlacingOrder ? 'Placing Order...' : `Place Order (${totalCartUniqueItems} Items)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Order Modal (Supports both Add to Cart & Buy Now) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center px-4 py-3 text-sm border-b border-gray-100 bg-gray-50/70">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag size={18} className="text-emerald-600" /> Order Product
              </h2>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <img src={selectedProduct.image} alt={selectedProduct.material?.name} className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{selectedProduct.material?.name}</h3>
                  <div className="flex gap-2 items-center mt-0.5">
                    <span className="text-xs text-gray-500">SKU: {selectedProduct.material?.sku}</span>
                    {selectedProduct.store && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium truncate">
                        {selectedProduct.store.name}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-emerald-700 text-sm mt-1">Rs. {Number(selectedProduct.price).toLocaleString()} / {selectedProduct.material?.baseUnit}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Select Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-700 cursor-pointer"
                  >-</button>
                  <input 
                    type="number" 
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, Math.min(selectedProduct.availableQuantity, Number(e.target.value) || 1)))}
                    min="1"
                    max={selectedProduct.availableQuantity}
                    className="w-20 text-center py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  />
                  <button 
                    onClick={() => setOrderQuantity(Math.min(selectedProduct.availableQuantity, orderQuantity + 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-700 cursor-pointer"
                  >+</button>
                  <span className="text-xs text-gray-500">
                    Max: {selectedProduct.availableQuantity} {selectedProduct.material?.baseUnit}
                  </span>
                </div>
              </div>

              {/* Delivery Date Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-600" />
                  Select Delivery Date *
                </label>
                <input 
                  type="date"
                  min={todayStr}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm text-gray-800 bg-white"
                />
              </div>

              {/* Delivery info pre-filled automatically from registration */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 mb-1">
                  <MapPin size={13} className="text-emerald-600" />
                  <span>Delivery Details (From Registration)</span>
                </div>
                <p className="font-bold text-gray-900">{currentUser.name || currentUser.email?.split('@')[0] || 'Customer'}</p>
                <p className="text-gray-600 mt-0.5">{currentUser.address || 'Standard Registered Delivery'}</p>
                {currentUser.phone && (
                  <p className="text-gray-500 mt-0.5 flex items-center gap-1">
                    <Phone size={11} /> {currentUser.phone}
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-xs text-gray-500 uppercase font-medium">Total Amount</span>
                <span className="text-xl font-black text-gray-900">
                  Rs. {(selectedProduct.price * orderQuantity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  onClick={() => {
                    addToCart(selectedProduct, orderQuantity);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart size={14} />
                  Add to Cart
                </button>
                <button 
                  disabled={isPlacingOrder}
                  onClick={async () => {
                    if (!deliveryDate) {
                      alert('Please select a delivery date');
                      return;
                    }

                    setIsPlacingOrder(true);
                    try {
                      const orderName = currentUser.name || currentUser.email?.split('@')[0] || 'Customer';
                      const orderAddress = currentUser.address || 'Customer Registered Address';

                      const orderRes = await deliveryService.createDelivery({
                        customerShopName: orderName,
                        customerAddress: orderAddress,
                        storeId: selectedProduct.store._id,
                        materialId: selectedProduct.material._id,
                        quantity: orderQuantity,
                        unit: selectedProduct.material.baseUnit,
                        status: 'PENDING',
                        scheduledDate: deliveryDate,
                        notes: 'Ordered via Customer Portal'
                      });
                      
                      // Dispatch notification event for admins
                      window.dispatchEvent(new CustomEvent('new-customer-order', { detail: orderRes?.data }));
                      try {
                        localStorage.setItem('last_customer_order_time', Date.now().toString());
                      } catch (e) {}

                      alert('Order placed successfully!');
                      setSelectedProduct(null);
                      fetchProducts();
                    } catch (err) {
                      alert('Failed to place order: ' + (err.response?.data?.message || err.message));
                    } finally {
                      setIsPlacingOrder(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs hover:from-emerald-700 hover:to-teal-700 transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPlacingOrder ? 'Placing...' : 'Buy Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerItemList;
