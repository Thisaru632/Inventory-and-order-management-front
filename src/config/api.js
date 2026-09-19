let rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// In live production over HTTPS, prevent mixed-content blocking by falling back to deployed backend
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'))) {
  rawUrl = 'https://inventory-and-order-management-back.vercel.app';
}

export const API_BASE_URL = rawUrl.replace(/\/+$/, '');
