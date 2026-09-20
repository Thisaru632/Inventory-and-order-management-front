import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCcw, Activity, Calendar } from 'lucide-react';
import inventoryService from '../services/inventoryService';
import { getAssignedWarehouse, matchesWarehouse } from '../utils/auth';

const TransactionAuditLog = () => {
  const assignedWarehouse = getAssignedWarehouse();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const res = await inventoryService.getTransactionHistory({ limit: 50 });
        if (res.success) {
          const data = res.data || [];
          const filtered = assignedWarehouse 
            ? data.filter(tx => matchesWarehouse(tx.store?.name, assignedWarehouse))
            : data;
          setTransactions(filtered);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch transaction history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
    
    // Listen for updates from sidebar actions
    window.addEventListener('inventory-updated', fetchTransactions);
    return () => {
      window.removeEventListener('inventory-updated', fetchTransactions);
    };
  }, []);

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'STOCK_IN': return <ArrowDownCircle className="text-emerald-500" size={18} />;
      case 'STOCK_OUT': return <ArrowUpCircle className="text-teal-500" size={18} />;
      case 'RETURN_IN':
      case 'RETURN_OUT': return <RefreshCcw className="text-orange-500" size={18} />;
      case 'ADJUSTMENT': return <Activity className="text-purple-500" size={18} />;
      default: return null;
    }
  };

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'STOCK_IN': return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">Stock In</span>;
      case 'STOCK_OUT': return <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs font-medium">Stock Out</span>;
      case 'RETURN_IN': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">Return In</span>;
      case 'RETURN_OUT': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">Return Out</span>;
      case 'ADJUSTMENT': return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">Adjustment</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">{type}</span>;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading audit log...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transaction Audit Log</h1>
          <p className="text-gray-500 text-sm mt-1">
            {assignedWarehouse ? `Immutable ledger of stock movements for ${assignedWarehouse}` : 'Immutable ledger of all stock movements'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Date & Time</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Material & Location</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Change (Base)</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">New Balance</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Ref / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.newBalance >= tx.previousBalance;
                  const diff = tx.newBalance - tx.previousBalance;
                  
                  return (
                    <tr key={tx._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.type)}
                          {getTransactionBadge(tx.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{tx.material?.name || tx.material || 'N/A'}</div>
                        <div className="text-xs text-gray-500 mt-1">{tx.store?.name || tx.store || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          {isPositive ? '+' : ''}{diff}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          Input: {tx.quantity} {tx.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {tx.newBalance}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-800 font-medium">{tx.referenceNumber || '-'}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={tx.reason}>
                          {tx.reason || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionAuditLog;
