import api from './api';

export const checkoutOrder = async (payload: {
  items: { productId: string; quantity: number }[];
  phone: string;
  shippingAddress: { line1: string; city?: string; district?: string; postalCode?: string };
  instructions?: string;
}) => {
  const res = await api.post('/orders/checkout', payload);
  return res.data;
};

export const getBuyerOrders = async () => {
  const res = await api.get('/orders/buyer');
  return res.data;
};

export const getSellerOrders = async () => {
  const res = await api.get('/orders/seller');
  return res.data;
};

export const sellerDecision = async (orderId: string, decision: 'Accepted' | 'Rejected') => {
  const res = await api.put(`/orders/${orderId}/seller-decision`, { decision });
  return res.data;
};

// employee/admin
export const getEmployeeOrders = async () => {
  const res = await api.get('/orders/employee');
  return res.data;
};

export const employeeAssignDelivery = async (orderId: string, deliverymanId?: string) => {
  const res = await api.put(`/orders/${orderId}/assign-delivery`, { deliverymanId });
  return res.data;
};

// delivery
export const getDeliveryOrders = async () => {
  const res = await api.get('/orders/delivery');
  return res.data;
};

export const deliveryUpdateStatus = async (
  orderId: string,
  status: 'InTransit' | 'Delivered' | 'NotReceived'
) => {
  const res = await api.put(`/orders/${orderId}/delivery-status`, { status });
  return res.data;
};

// buyer cancel (only before seller accepts)
export const cancelBuyerOrderRequest = async (orderId: string, reason?: string) => {
  const res = await api.patch(`/orders/${orderId}/buyer-cancel`, { reason });
  return res.data;
};