import api from './api';

export const fetchProducts = async () => {
  const res = await api.get('/products');
  return res.data;
};

export const fetchProductById = async (id: string) => {
  const res = await api.get(`/products/${id}`);
  return res.data;
};

export const fetchMySellerProducts = async () => {
  const res = await api.get('/products/my');
  return res.data;
};

export const createProduct = async (payload: {
  name: string;
  price: number;
  description?: string;
  imageUrls?: string[]; // url list
  imageFiles?: File[];  // uploaded files
}) => {
  const fd = new FormData();
  fd.append('name', payload.name);
  fd.append('price', String(payload.price));
  if (payload.description) fd.append('description', payload.description);

  (payload.imageUrls || []).forEach((u) => fd.append('imageUrls', u));
  (payload.imageFiles || []).forEach((f) => fd.append('images', f));

  const res = await api.post('/products', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};