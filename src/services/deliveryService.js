import axios from 'axios';

const API_URL = 'http://localhost:5000/api/deliveries';

const getAuthParams = (params = {}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && user.role !== 'Super Admin' && user.warehouse && user.warehouse !== 'All Warehouses') {
    return { ...params, warehouseName: user.warehouse };
  }
  return params;
};

const getDeliveries = async (params = {}) => {
  const finalParams = getAuthParams(params);
  const response = await axios.get(API_URL, { params: finalParams });
  return response.data;
};

const createDelivery = async (data) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

const updateDeliveryStatus = async (id, status, scheduledDate = null) => {
  const payload = { status };
  if (scheduledDate) payload.scheduledDate = scheduledDate;
  const response = await axios.put(`${API_URL}/${id}/status`, payload);
  return response.data;
};

const cancelDelivery = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

export default {
  getDeliveries,
  createDelivery,
  updateDeliveryStatus,
  cancelDelivery
};
