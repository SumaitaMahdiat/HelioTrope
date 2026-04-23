import api from './api';

export const getProductReviews = async (productId: string) => {
  const res = await api.get(`/reviews/product/${productId}`);
  return res.data;
};

export const canReviewProduct = async (productId: string) => {
  const res = await api.get(`/reviews/product/${productId}/can-review`);
  return res.data;
};

export const submitProductReview = async (productId: string, data: FormData) => {
  const res = await api.post(`/reviews/product/${productId}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};