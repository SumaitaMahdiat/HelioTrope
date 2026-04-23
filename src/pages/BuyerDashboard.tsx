import React, { useEffect, useMemo, useState } from 'react';
import { getMyProfile, updateMyProfile } from '../services/userService';
import { cancelBuyerOrderRequest, getBuyerOrders } from '../services/orderService';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Order = {
  _id: string;
  status: string;
  totalAmount: number;
  seller?: { name: string };
  deliveryman?: { name: string };
  items: { product: { _id: string; name: string; price: number }; quantity: number }[];
  createdAt: string;
  deliveredAt?: string;
};

const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'profile' | 'orders' | 'wishlist' | 'reviews'>('profile');

  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);

  const load = async () => {
    const p = await getMyProfile();
    setProfile(p.user);

    const o = await getBuyerOrders();
    setOrders(o.orders || []);
  };

  useEffect(() => {
    load();
  }, []);

  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === 'Delivered'),
    [orders]
  );

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await updateMyProfile({
        phone: profile.phone,
        address: profile.address,
      });
      setMsg('✅ Profile updated');
      load();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCancel = async (orderId: string) => {
    const ok = window.confirm('Cancel this order?\nYou can only cancel before the seller accepts.');
    if (!ok) return;

    // optional reason
    const reason = window.prompt('Reason (optional):') || '';

    try {
      setCancelBusyId(orderId);
      setMsg(null);
      await cancelBuyerOrderRequest(orderId, reason);
      setMsg('✅ Order cancelled');
      await load();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelBusyId(null);
    }
  };

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <h1>Buyer Dashboard</h1>
        <p className="muted">
          Logged in as: {user?.name} ({user?.role})
        </p>
      </div>

      <div className="tabs-row">
        <button className={`tabbtn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          Profile
        </button>
        <button className={`tabbtn ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Orders
        </button>
        <button className={`tabbtn ${tab === 'wishlist' ? 'active' : ''}`} onClick={() => setTab('wishlist')}>
          Wishlist
        </button>
        <button className={`tabbtn ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>
          My Reviews
        </button>
      </div>

      <div className="dash-card">
        {tab === 'profile' && (
          <>
            <h2>Complete / Update Profile</h2>
            {!profile ? (
              <p className="muted">Loading profile...</p>
            ) : (
              <form className="form" onSubmit={saveProfile}>
                <label>
                  Phone
                  <input value={profile.phone || ''} onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))} />
                </label>

                <label>
                  Address line
                  <input
                    value={profile.address?.line1 || ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, address: { ...p.address, line1: e.target.value } }))}
                  />
                </label>

                <label>
                  City
                  <input
                    value={profile.address?.city || ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, address: { ...p.address, city: e.target.value } }))}
                  />
                </label>

                <label>
                  District
                  <input
                    value={profile.address?.district || ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, address: { ...p.address, district: e.target.value } }))}
                  />
                </label>

                <label>
                  Postal Code
                  <input
                    value={profile.address?.postalCode || ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, address: { ...p.address, postalCode: e.target.value } }))}
                  />
                </label>

                {msg && <div className="ok">{msg}</div>}
                <button className="btn-primary" type="submit">
                  Save
                </button>
              </form>
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            <h2>All Orders</h2>

            {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

            {orders.length === 0 ? (
              <p className="muted">No orders yet.</p>
            ) : (
              <div className="list">
                {orders.map((o) => (
                  <div className="list-item" key={o._id} style={{ alignItems: 'center' }}>
                    <div>
                      <div className="list-title">
                        {o.items?.[0]?.product?.name} {o.items?.length > 1 ? `(+${o.items.length - 1})` : ''}
                      </div>
                      <div className="muted">
                        Status: {o.status} • Total: ৳{o.totalAmount} • Seller: {o.seller?.name || '—'}
                      </div>

                      {o.status === 'PendingSeller' && (
                        <div className="muted" style={{ marginTop: 6 }}>
                          You can cancel this order until the seller accepts it.
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="pill">{new Date(o.createdAt).toLocaleDateString()}</div>

                      {o.status === 'PendingSeller' && (
                        <button
                          type="button"
                          className="pill"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                          disabled={cancelBusyId === o._id}
                          onClick={() => handleCancel(o._id)}
                        >
                          {cancelBusyId === o._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ marginTop: 18 }}>Delivered Orders (Review allowed)</h2>
            {deliveredOrders.length === 0 ? (
              <p className="muted">No delivered orders yet.</p>
            ) : (
              <div className="list">
                {deliveredOrders.map((o) => (
                  <div className="list-item" key={o._id}>
                    <div>
                      <div className="list-title">{o.items?.[0]?.product?.name}</div>
                      <div className="muted">Delivered at: {o.deliveredAt ? new Date(o.deliveredAt).toLocaleString() : '—'}</div>
                    </div>
                    <Link className="pill linkpill" to={`/products/${o.items?.[0]?.product?._id}/review`}>Write Review</Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'wishlist' && <p className="muted">Wishlist buttons/UI placeholder (no actions yet).</p>}
        {tab === 'reviews' && <p className="muted">My reviews list placeholder (we can implement later).</p>}
      </div>
    </div>
  );
};

export default BuyerDashboard;