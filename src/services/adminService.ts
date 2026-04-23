import api from './api';

// ─── Seller approvals ────────────────────────────────────────────
export const getPendingSellers = async () => {
  const res = await api.get('/admin/pending-sellers');
  return res.data;
};

export const approveSellerRequest = async (userId: string) => {
  const res = await api.patch(`/admin/sellers/${userId}/approve`);
  return res.data;
};

// ─── Feature 1: create staff ─────────────────────────────────────
export type StaffRole = 'employee' | 'delivery' | 'admin';

export const createStaffUserRequest = async (payload: {
  name: string;
  email: string;
  role: StaffRole;
  password?: string;
}) => {
  const res = await api.post('/admin/users', payload);
  return res.data;
};

// ─── Feature 2: block / unblock ──────────────────────────────────
export const blockUserRequest = async (userId: string, blocked: boolean, reason?: string) => {
  const res = await api.patch(`/admin/users/${userId}/block`, { blocked, reason });
  return res.data;
};

// ─── Feature 3: list / delete ────────────────────────────────────
export const listAllUsersRequest = async (params?: { role?: string; search?: string }) => {
  const res = await api.get('/admin/users', { params });
  return res.data;
};

export const deleteUserRequest = async (userId: string) => {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
};

export const listAllProductsRequest = async (params?: { search?: string }) => {
  const res = await api.get('/admin/products', { params });
  return res.data;
};

export const deleteProductRequest = async (productId: string) => {
  const res = await api.delete(`/admin/products/${productId}`);
  return res.data;
};

// ─── Feature 4: send offer email ─────────────────────────────────
export type OfferMode = 'all' | 'role' | 'single';
export type OfferRole = 'buyer' | 'seller' | 'employee' | 'admin' | 'delivery';

export const sendOfferEmailRequest = async (payload: {
  mode: OfferMode;
  subject: string;
  title: string;
  message: string;
  role?: OfferRole;
  email?: string;
}) => {
  const res = await api.post('/admin/offers/email', payload);
  return res.data;
};

// ─── Feature 5: low rating alerts ────────────────────────────────
export const getLowRatedProductsRequest = async (params?: {
  threshold?: number;
  minCount?: number;
}) => {
  const res = await api.get('/admin/alerts/low-rated', { params });
  return res.data;
};