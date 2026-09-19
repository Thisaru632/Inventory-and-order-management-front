import axios from 'axios';
import { API_BASE_URL } from '../config/api';

import { getAssignedWarehouse } from '../utils/auth';

const API_URL = `${API_BASE_URL}/api/inventory`;

// Helper that executes request with automatic local backend fallback if remote returns 404
const requestWithFallback = async (method, path, data = null, config = {}) => {
  const url = `${API_BASE_URL}${path}`;
  try {
    if (method === 'get') return (await axios.get(url, config)).data;
    if (method === 'post') return (await axios.post(url, data, config)).data;
    if (method === 'put') return (await axios.put(url, data, config)).data;
    if (method === 'delete') return (await axios.delete(url, config)).data;
  } catch (err) {
    if ((err.response?.status === 404 || !err.response) && !API_BASE_URL.includes('localhost') && !API_BASE_URL.includes('127.0.0.1')) {
      try {
        const localUrl = `http://localhost:5000${path}`;
        if (method === 'get') return (await axios.get(localUrl, config)).data;
        if (method === 'post') return (await axios.post(localUrl, data, config)).data;
        if (method === 'put') return (await axios.put(localUrl, data, config)).data;
        if (method === 'delete') return (await axios.delete(localUrl, config)).data;
      } catch (localErr) {
        throw err;
      }
    }
    throw err;
  }
};

const getAuthParams = (params = {}) => {
  const warehouse = getAssignedWarehouse();
  if (warehouse) {
    return { ...params, warehouseName: warehouse };
  }
  return params;
};

const getStoreStock = async (params = {}) => {
  const finalParams = getAuthParams(params);
  return requestWithFallback('get', '/api/inventory/stock', null, { params: finalParams });
};

const getTransactionHistory = async (params = {}) => {
  const finalParams = getAuthParams(params);
  return requestWithFallback('get', '/api/inventory/transactions', null, { params: finalParams });
};

const recordStockIn = async (data) => {
  return requestWithFallback('post', '/api/inventory/stock-in', data);
};

const recordStockOut = async (data) => {
  return requestWithFallback('post', '/api/inventory/stock-out', data);
};

const recordReturn = async (data) => {
  return requestWithFallback('post', '/api/inventory/return', data);
};

const recordAdjustment = async (data) => {
  return requestWithFallback('post', '/api/inventory/adjustment', data);
};

const deleteInventory = async (id) => {
  return requestWithFallback('delete', `/api/inventory/${id}`);
};

const getStores = async () => {
  return requestWithFallback('get', '/api/master-data/stores');
};

const createStore = async (data) => {
  return requestWithFallback('post', '/api/master-data/stores', data);
};

const updateStore = async (id, data) => {
  return requestWithFallback('put', `/api/master-data/stores/${id}`, data);
};

const deleteStore = async (id) => {
  return requestWithFallback('delete', `/api/master-data/stores/${id}`);
};

const getMaterials = async () => {
  return requestWithFallback('get', '/api/master-data/materials');
};

const createMaterial = async (data) => {
  return requestWithFallback('post', '/api/master-data/materials', data);
};

const updateMaterial = async (id, data) => {
  return requestWithFallback('put', `/api/master-data/materials/${id}`, data);
};

const deleteMaterial = async (id) => {
  return requestWithFallback('delete', `/api/master-data/materials/${id}`);
};

const getSuppliers = async () => {
  return requestWithFallback('get', '/api/master-data/suppliers');
};

export default {
  getStoreStock,
  getTransactionHistory,
  recordStockIn,
  recordStockOut,
  recordReturn,
  recordAdjustment,
  deleteInventory,
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getSuppliers,
};
