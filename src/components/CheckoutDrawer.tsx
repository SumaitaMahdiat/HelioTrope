import React, { useEffect, useMemo, useState } from 'react';
import { useCart, CartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../services/userService';
import { checkoutOrder } from '../services/orderService';

type Props = {
  open: boolean;
  onClose: () => void;
};

const CheckoutDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { items } = useCart();

  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState({ line1: '', city: '', district: '', postalCode: '' });
  const [instructions, setInstructions] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const includedItems = useMemo(
    () => items.filter((it: CartItem) => !excluded.has(it.productId)),
    [items, excluded]
  );

  const total = useMemo(
    () => includedItems.reduce((sum: number, it: CartItem) => sum + it.price * it.quantity, 0),
    [includedItems]
  );

  useEffect(() => {
    if (!open) return;

    setMsg(null);
    setExcluded(new Set());
    setInstructions('');

    (async () => {
      if (!user) return;
      try {
        const data = await getMyProfile();
        const u = data.user;
        setPhone(u?.phone || '');
        setAddr({
          line1: u?.address?.line1 || '',
          city: u?.address?.city || '',
          district: u?.address?.district || '',
          postalCode: u?.address?.postalCode || '',
        });
      } catch {
        // ignore
      }
    })();
  }, [open, user]);

  const removeFromThisCheckout = (productId: string) => {
    setExcluded((prev) => new Set([...prev, productId]));
  };

  const placeOrder = async () => {
    setMsg(null);
    if (!user) return setMsg('Please login first.');
    if (user.role !== 'buyer') return setMsg('Only buyers can place orders.');
    if (includedItems.length === 0) return setMsg('No items selected for checkout.');
    if (!phone.trim()) return setMsg('Phone is required.');
    if (!addr.line1.trim()) return setMsg('Address line1 is required.');

    setLoading(true);
    try {
      const payload = {
        items: includedItems.map((it: CartItem) => ({ productId: it.productId, quantity: it.quantity })),
        phone: phone.trim(),
        shippingAddress: addr,
        instructions,
      };

      const data = await checkoutOrder(payload);
      setMsg(`✅ Order placed (${data.orders.length} seller order(s) created).`);
      // As you requested: removing here doesn't remove from cart
      // Also we won't clear the cart automatically.
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <aside className={`drawer ${open ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Checkout</h2>
          <button className="drawer-x" onClick={onClose}>×</button>
        </div>

        <div className="drawer-section">
          <div className="muted">Cart items: {items.length} • Selected: {includedItems.length}</div>

          {includedItems.length === 0 ? (
            <p className="muted" style={{ marginTop: 10 }}>No selected items (removed from this checkout view).</p>
          ) : (
            <div className="list" style={{ marginTop: 10 }}>
              {includedItems.map((it: CartItem) => (
                <div className="list-item" key={it.productId}>
                  <div>
                    <div className="list-title">{it.name}</div>
                    <div className="muted">৳{it.price} × {it.quantity}</div>
                  </div>
                  <button className="pill red" onClick={() => removeFromThisCheckout(it.productId)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="drawer-section">
          <div className="drawer-total">
            <span>Total</span>
            <strong>৳{total}</strong>
          </div>
        </div>

        <div className="drawer-section form">
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </label>

          <label>
            Address line
            <input value={addr.line1} onChange={(e) => setAddr((p) => ({ ...p, line1: e.target.value }))} />
          </label>

          <label>
            City
            <input value={addr.city} onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))} />
          </label>

          <label>
            District
            <input value={addr.district} onChange={(e) => setAddr((p) => ({ ...p, district: e.target.value }))} />
          </label>

          <label>
            Postal Code
            <input value={addr.postalCode} onChange={(e) => setAddr((p) => ({ ...p, postalCode: e.target.value }))} />
          </label>

          <label>
            Instructions (optional)
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </label>

          {msg && <div className="ok">{msg}</div>}

          <button className="btn-primary" onClick={placeOrder} disabled={loading}>
            {loading ? 'Placing...' : 'Place Order'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </aside>
    </div>
  );
};

export default CheckoutDrawer;