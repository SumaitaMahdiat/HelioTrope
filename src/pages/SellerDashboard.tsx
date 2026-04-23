import React, { useEffect, useState } from 'react';
import { createProduct, fetchMySellerProducts } from '../services/productService';
import { getSellerOrders, sellerDecision } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

type Product = {
  _id: string;
  name: string;
  price: number;
  ratingAverage: number;
  ratingCount: number;
};

type SellerOrder = {
  _id: string;
  status: string;
  totalAmount: number;
  buyer?: { name: string; email: string; phone: string };
  phone: string;
  shippingAddress: { line1: string; city?: string; district?: string; postalCode?: string };
  instructions?: string;
  items: { name: string; price: number; quantity: number }[];
  createdAt: string;
};

const SellerDashboard: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', price: '', description: '', imageUrls: '' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const load = async () => {
    const p = await fetchMySellerProducts();
    setProducts(p.products || []);

    const o = await getSellerOrders();
    setOrders(o.orders || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const urls = form.imageUrls
      ? form.imageUrls.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      await createProduct({
        name: form.name,
        price: Number(form.price),
        description: form.description,
        imageUrls: urls,
        imageFiles,
      });

      setForm({ name: '', price: '', description: '', imageUrls: '' });
      setImageFiles([]);
      setMsg('✅ Product created');
      load();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to create product');
    }
  };

  const decide = async (orderId: string, decisionValue: 'Accepted' | 'Rejected') => {
    setMsg(null);
    try {
      await sellerDecision(orderId, decisionValue);
      setMsg(`✅ Order ${decisionValue}`);
      load();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <h1>Seller Dashboard</h1>
        <p className="muted">Logged in as: {user?.name} ({user?.role})</p>
      </div>

      {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="dash-grid">
        <div className="dash-card">
          <h2>Add Product</h2>
          <form onSubmit={onCreateProduct} className="form">
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </label>

            <label>
              Price
              <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
            </label>

            <label>
              Description
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>

            <label>
              Upload Images (optional, max 6)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0, 6))}
              />
            </label>

            <label>
              Or Image URLs (comma separated, optional)
              <input value={form.imageUrls} onChange={(e) => setForm((p) => ({ ...p, imageUrls: e.target.value }))} />
            </label>

            <button className="btn-primary" type="submit">Create Product</button>
          </form>
        </div>

        <div className="dash-card">
          <h2>My Products</h2>
          {products.length === 0 ? (
            <p className="muted">No products yet.</p>
          ) : (
            <div className="list">
              {products.map((p) => (
                <div className="list-item" key={p._id}>
                  <div>
                    <div className="list-title">{p.name}</div>
                    <div className="muted">৳{p.price} • ⭐ {p.ratingAverage} ({p.ratingCount})</div>
                  </div>
                  <div className="pill">Active</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dash-card" style={{ marginTop: 14 }}>
        <h2>Incoming Orders</h2>

        {orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <div className="list">
            {orders.map((o) => (
              <div className="review-card" key={o._id}>
                <div className="review-top">
                  <div className="list-title">Order #{o._id.slice(-6)}</div>
                  <div className="pill">{o.status}</div>
                </div>

                <div className="muted" style={{ marginTop: 6 }}>
                  Buyer: {o.buyer?.name} ({o.buyer?.email}) • Phone: {o.phone || o.buyer?.phone}
                </div>

                <div className="muted">
                  Address: {o.shippingAddress?.line1}, {o.shippingAddress?.city || ''} {o.shippingAddress?.district || ''}
                </div>

                {o.instructions && <div className="muted">Instruction: {o.instructions}</div>}

                <div style={{ marginTop: 10 }}>
                  {o.items.map((it, idx) => (
                    <div className="muted" key={idx}>
                      • {it.name} — ৳{it.price} × {it.quantity}
                    </div>
                  ))}
                </div>

                <div className="muted" style={{ marginTop: 10 }}>Total: ৳{o.totalAmount}</div>

                {o.status === 'PendingSeller' && (
                  <div className="rowgap" style={{ marginTop: 10 }}>
                    <button className="pill green" onClick={() => decide(o._id, 'Accepted')}>Accept</button>
                    <button className="pill red" onClick={() => decide(o._id, 'Rejected')}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default SellerDashboard;