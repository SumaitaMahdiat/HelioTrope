import api from './api';

export const getMyProfile = async () => {
  const res = await api.get('/users/me');
  return res.data;
};

export const updateMyProfile = async (payload: any) => {
  const res = await api.put('/users/me', payload);
  return res.data;
};

export const listDeliverymen = async () => {
  const res = await api.get('/users/deliverymen');
  return res.data;
};