import React, { useEffect, useState } from 'react';
import { getDeliveryOrders, deliveryUpdateStatus } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

type DeliveryOrder = {
  _id: string;
  status: string;
  buyer?: { name: string; email: string; phone: string };
  seller?: { name: string };
  items: { name: string; price: number; quantity: number }[];
  shippingAddress: { line1: string; city?: string; district?: string };
};

const DeliveryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const data = await getDeliveryOrders();
    setOrders(data.orders || []);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (orderId: string, status: 'InTransit' | 'Delivered' | 'NotReceived') => {
    setMsg(null);
    try {
      await deliveryUpdateStatus(orderId, status);
      setMsg(`✅ Updated: ${status}`);
      load();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <h1>Delivery Dashboard</h1>
        <p className="muted">Logged in as: {user?.name} ({user?.role})</p>
      </div>

      {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="dash-card">
        <h2>Assigned Deliveries</h2>

        {orders.length === 0 ? (
          <p className="muted">No assigned deliveries.</p>
        ) : (
          <div className="list">
            {orders.map((o) => (
              <div className="list-item" key={o._id}>
                <div>
                  <div className="list-title">Order #{o._id.slice(-6)} ({o.status})</div>
                  <div className="muted">
                    Buyer: {o.buyer?.name} • Phone: {o.buyer?.phone}
                  </div>
                  <div className="muted">
                    Address: {o.shippingAddress?.line1}, {o.shippingAddress?.city || ''} {o.shippingAddress?.district || ''}
                  </div>
                  <div className="muted">
                    Items: {o.items.map((it) => `${it.name} x${it.quantity}`).join(', ')}
                  </div>
                </div>

                <div className="rowgap">
                  <button className="pill" onClick={() => setStatus(o._id, 'InTransit')}>In Transit</button>
                  <button className="pill green" onClick={() => setStatus(o._id, 'Delivered')}>Delivered</button>
                  <button className="pill red" onClick={() => setStatus(o._id, 'NotReceived')}>Not received</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;