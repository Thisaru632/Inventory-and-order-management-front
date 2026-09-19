import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api/inventory`;

const getAuthParams = (params = {}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && user.role !== 'Super Admin' && user.warehouse && user.warehouse !== 'All Warehouses') {
    return { ...params, warehouseName: user.warehouse };
  }
  return params;
};

const getStoreStock = async (params = {}) => {
  const finalParams = getAuthParams(params);
  const response = await axios.get(`${API_URL}/stock`, { params: finalParams });
  return response.data;
};

const getTransactionHistory = async (params = {}) => {
  const finalParams = getAuthParams(params);
  const response = await axios.get(`${API_URL}/transactions`, { params: finalParams });
  return response.data;
};

const recordStockIn = async (data) => {
  const response = await axios.post(`${API_URL}/stock-in`, data);
  return response.data;
};

const recordStockOut = async (data) => {
  const response = await axios.post(`${API_URL}/stock-out`, data);
  return response.data;
};

const recordReturn = async (data) => {
  const response = await axios.post(`${API_URL}/return`, data);
  return response.data;
};

const recordAdjustment = async (data) => {
  const response = await axios.post(`${API_URL}/adjustment`, data);
  return response.data;
};

const deleteInventory = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

const getStores = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/master-data/stores`);
  return response.data;
};

const createStore = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/api/master-data/stores`, data);
  return response.data;
};

const updateStore = async (id, data) => {
  const response = await axios.put(`${API_BASE_URL}/api/master-data/stores/${id}`, data);
  return response.data;
};

const deleteStore = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/api/master-data/stores/${id}`);
  return response.data;
};

const getMaterials = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/master-data/materials`);
  return response.data;
};

const createMaterial = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/api/master-data/materials`, data);
  return response.data;
};

const getSuppliers = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/master-data/suppliers`);
  return response.data;
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
  getSuppliers,
};
