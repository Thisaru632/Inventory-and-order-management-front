import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getAssignedWarehouse } from '../utils/auth';

const API_URL = `${API_BASE_URL}/api/sales`;

const getAuthParams = (params = {}) => {
  const warehouse = getAssignedWarehouse();
  if (warehouse) {
    return { ...params, warehouseName: warehouse };
  }
  return params;
};

const createSale = async (data) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

const getSales = async (params = {}) => {
  const finalParams = getAuthParams(params);
  const response = await axios.get(API_URL, { params: finalParams });
  return response.data;
};

const getSaleById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export default {
  createSale,
  getSales,
  getSaleById
};
