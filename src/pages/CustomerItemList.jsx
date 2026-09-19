import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, ShoppingBag, X, MapPin, Phone } from 'lucide-react';
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

  // Auto-get logged in customer registration details
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();



  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getStoreStock();
      if (res.success && res.data.length > 0) {
        // Map actual inventory to e-commerce format
        const mappedData = res.data.map((item) => ({
          ...item,
          price: item.unitSellingPrice || 0,
          image: item.imageUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80" // Fallback generic image
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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Storefront Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                <ShoppingBag className="text-blue-600" size={32} />
                Product Catalog
              </h1>
              <p className="text-gray-500 mt-2">Browse our high-quality construction materials.</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                />
              </div>
              <button className="p-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 transition">
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No products found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img 
                    src={product.image} 
                    alt={product.material?.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.availableQuantity <= 10 && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      Low Stock
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-gray-500 font-medium">SKU: {product.material?.sku}</div>
                    {product.store && (
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {product.store.name}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 leading-tight">
                    {product.material?.name}
                  </h3>
                  
                  <div className="mt-auto pt-4 flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-black text-gray-900">Rs. {Number(product.price).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">per {product.material?.baseUnit}</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setSelectedProduct(product);
                      setOrderQuantity(1);
                    }}
                    className="mt-5 w-full py-2.5 px-4 bg-gray-900 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingCart size={18} />
                    Order Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Direct Order Modal (Automatically uses customer's registered details) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center px-4 py-3 text-sm border-b border-gray-100 bg-gray-50/70">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag size={18} className="text-blue-600" /> Order Product
              </h2>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
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
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium truncate">
                        {selectedProduct.store.name}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-blue-600 text-sm mt-1">Rs. {Number(selectedProduct.price).toLocaleString()} / {selectedProduct.material?.baseUnit}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Select Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-700"
                  >-</button>
                  <input 
                    type="number" 
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, Math.min(selectedProduct.availableQuantity, Number(e.target.value) || 1)))}
                    min="1"
                    max={selectedProduct.availableQuantity}
                    className="w-20 text-center py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                  />
                  <button 
                    onClick={() => setOrderQuantity(Math.min(selectedProduct.availableQuantity, orderQuantity + 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-700"
                  >+</button>
                  <span className="text-xs text-gray-500">
                    Max: {selectedProduct.availableQuantity} {selectedProduct.material?.baseUnit}
                  </span>
                </div>
              </div>

              {/* Delivery info pre-filled automatically from registration */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-blue-800 mb-1">
                  <MapPin size={13} className="text-blue-600" />
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
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  disabled={isPlacingOrder}
                  onClick={async () => {
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
                        notes: 'Ordered via Customer Portal'
                      });
                      
                      // Dispatch notification event for admins
                      window.dispatchEvent(new CustomEvent('new-customer-order', { detail: orderRes?.data }));
                      try {
                        localStorage.setItem('last_customer_order_time', Date.now().toString());
                      } catch (e) {}

                      alert('Order placed successfully!');
                      setSelectedProduct(null);
                      fetchProducts(); // refresh inventory
                    } catch (err) {
                      alert('Failed to place order: ' + (err.response?.data?.message || err.message));
                    } finally {
                      setIsPlacingOrder(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? 'Placing...' : 'Place Order'}
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
