// Helper utilities for user authentication and warehouse-scoped access control

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const isSuperAdmin = (user = getCurrentUser()) => {
  if (!user || !user.role) return false;
  const role = user.role.toString().toLowerCase().trim();
  return role === 'super admin' || role === 'superadmin';
};

export const getAssignedWarehouse = (user = getCurrentUser()) => {
  if (!user || isSuperAdmin(user)) return null;
  const warehouse = (user.warehouse || '').trim();
  if (!warehouse || warehouse === 'All Warehouses') return null;
  return warehouse;
};

export const matchesWarehouse = (storeName, targetWarehouse) => {
  if (!targetWarehouse || targetWarehouse === 'All Warehouses') return true;
  if (!storeName) return false;
  
  const s = storeName.toLowerCase().trim();
  const t = targetWarehouse.toLowerCase().trim();
  
  if (s === t) return true;
  if (s.includes(t) || t.includes(s)) return true;
  
  const firstWordS = s.split(/[\s_-]+/)[0];
  const firstWordT = t.split(/[\s_-]+/)[0];
  if (firstWordS && firstWordT && firstWordS === firstWordT) return true;
  
  return false;
};
