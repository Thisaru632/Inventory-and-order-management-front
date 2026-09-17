import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, ShoppingBag, X } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import deliveryService from '../services/deliveryService';

const CustomerItemList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [customerShopName, setCustomerShopName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);



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
      {/* Order Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center px-2 py-1 text-sm border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Order Product</h2>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-3">
              <div className="flex gap-3 mb-6">
                <img src={selectedProduct.image} alt={selectedProduct.material?.name} className="w-20 h-20 object-cover rounded-lg" />
                <div>
                  <h3 className="font-bold text-gray-900">{selectedProduct.material?.name}</h3>
                  <div className="flex gap-2 items-center mb-1">
                    <div className="text-sm text-gray-500">SKU: {selectedProduct.material?.sku}</div>
                    {selectedProduct.store && (
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {selectedProduct.store.name}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-blue-600">Rs. {Number(selectedProduct.price).toLocaleString()} / {selectedProduct.material?.baseUnit}</div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-700 mb-2">Select Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >-</button>
                  <input 
                    type="number" 
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    min="1"
                    max={selectedProduct.availableQuantity}
                    className="w-20 text-center py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={() => setOrderQuantity(Math.min(selectedProduct.availableQuantity, orderQuantity + 1))}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >+</button>
                </div>
                <div className="text-xs text-gray-500 mt-2">Available: {selectedProduct.availableQuantity} {selectedProduct.material?.baseUnit}</div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center mb-6">
                <div className="text-gray-500">Total</div>
                <div className="text-2xl font-bold text-gray-900">
                  Rs. {(selectedProduct.price * orderQuantity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsAddressModalOpen(true);
                }}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {isAddressModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-3">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Delivery Details</h2>
            
            <div className="space-y-2 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Name / Shop Name</label>
                <input 
                  type="text" 
                  value={customerShopName}
                  onChange={(e) => setCustomerShopName(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., John Hardware"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Address</label>
                <textarea 
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  rows="3"
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full delivery address"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsAddressModalOpen(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button 
                disabled={isPlacingOrder || !customerShopName || !customerAddress}
                onClick={async () => {
                  setIsPlacingOrder(true);
                  try {
                    await deliveryService.createDelivery({
                      customerShopName,
                      customerAddress,
                      storeId: selectedProduct.store._id,
                      materialId: selectedProduct.material._id,
                      quantity: orderQuantity,
                      unit: selectedProduct.material.baseUnit,
                      status: 'PENDING',
                      notes: 'Ordered via Customer Portal'
                    });
                    alert('Order placed successfully!');
                    setIsAddressModalOpen(false);
                    setSelectedProduct(null);
                    setCustomerShopName('');
                    setCustomerAddress('');
                    fetchProducts(); // refresh inventory
                  } catch (err) {
                    alert('Failed to place order: ' + (err.response?.data?.message || err.message));
                  } finally {
                    setIsPlacingOrder(false);
                  }
                }}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isPlacingOrder ? 'Saving...' : 'Save & Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerItemList;
