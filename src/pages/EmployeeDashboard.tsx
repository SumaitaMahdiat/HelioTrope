import React, { useEffect, useState } from 'react';
import { getEmployeeOrders, employeeAssignDelivery } from '../services/orderService';
import { listDeliverymen } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import {
  approveSellerRequest,
  blockUserRequest,
  createStaffUserRequest,
  deleteProductRequest,
  deleteUserRequest,
  getLowRatedProductsRequest,
  getPendingSellers,
  listAllProductsRequest,
  listAllUsersRequest,
  sendOfferEmailRequest,
  OfferMode,
  OfferRole,
  StaffRole,
} from '../services/adminService';

// ─── Types ────────────────────────────────────────────────────────
type Deliveryman = { _id: string; name: string; email: string };

type EmployeeOrder = {
  _id: string;
  status: string;
  totalAmount: number;
  buyer?: { name: string; email: string; phone: string };
  seller?: { name: string };
  items: { name: string; quantity: number }[];
};

type PendingSeller = { _id: string; name: string; email: string; createdAt: string };

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  blockedReason?: string;
};

type AdminProduct = {
  _id: string;
  name: string;
  price: number;
  ratingAverage: number;
  ratingCount: number;
  seller?: { name: string; email: string };
};

type Tab = 'orders' | 'sellers' | 'staff' | 'email' | 'users' | 'products' | 'alerts';

// ─── Component ───────────────────────────────────────────────────
const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<Tab>('orders');
  const [msg, setMsg] = useState<string | null>(null);

  // ── Delivery assignment ────────────────────────────
  const [orders, setOrders] = useState<EmployeeOrder[]>([]);
  const [deliverymen, setDeliverymen] = useState<Deliveryman[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});

  // ── Seller approvals ───────────────────────────────
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [busySellerId, setBusySellerId] = useState<string | null>(null);

  // ── Feature 1: create staff ────────────────────────
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'employee' as StaffRole, password: '' });
  const [creatingStaff, setCreatingStaff] = useState(false);

  // ── Feature 2+3: users list ────────────────────────
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // ── Feature 3: products list ───────────────────────
  const [allProducts, setAllProducts] = useState<AdminProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  // ── Feature 4: send offer email ────────────────────
  const [offerMode, setOfferMode] = useState<OfferMode>('all');
  const [offerRole, setOfferRole] = useState<OfferRole>('buyer');
  const [offerEmail, setOfferEmail] = useState('');
  const [offerSubject, setOfferSubject] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);

  // ── Feature 5: low rated ───────────────────────────
  const [lowRated, setLowRated] = useState<AdminProduct[]>([]);
  const [loadingLow, setLoadingLow] = useState(false);

  // ─── Loaders ──────────────────────────────────────
  const loadOrders = async () => {
    const o = await getEmployeeOrders();
    setOrders(o.orders || []);
    const d = await listDeliverymen();
    setDeliverymen(d.deliverymen || []);
  };

  const loadPending = async () => {
    if (!isAdmin) return;
    const res = await getPendingSellers();
    setPendingSellers(res.sellers || []);
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    const res = await listAllUsersRequest({ role: userRoleFilter || undefined, search: userSearch || undefined });
    setAllUsers(res.users || []);
  };

  const loadProducts = async () => {
    if (!isAdmin) return;
    const res = await listAllProductsRequest({ search: productSearch || undefined });
    setAllProducts(res.products || []);
  };

  const loadLowRated = async () => {
    if (!isAdmin) return;
    setLoadingLow(true);
    try {
      const res = await getLowRatedProductsRequest({ threshold: 1, minCount: 3 });
      setLowRated(res.products || []);
    } finally {
      setLoadingLow(false);
    }
  };

  useEffect(() => {
    loadOrders();
    if (isAdmin) {
      loadPending();
      loadUsers();
      loadProducts();
      loadLowRated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ─── Actions ──────────────────────────────────────
  const assign = async (orderId: string) => {
    setMsg(null);
    try {
      await employeeAssignDelivery(orderId, selected[orderId] || undefined);
      setMsg('✅ Assigned deliveryman');
      loadOrders();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    }
  };

  const approveSeller = async (sellerId: string) => {
    setMsg(null);
    try {
      setBusySellerId(sellerId);
      await approveSellerRequest(sellerId);
      setMsg('✅ Seller approved');
      await loadPending();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    } finally {
      setBusySellerId(null);
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      setCreatingStaff(true);
      await createStaffUserRequest({
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        role: staffForm.role,
        password: staffForm.password.trim() || undefined,
      });
      setMsg('✅ Staff account created and credentials emailed');
      setStaffForm({ name: '', email: '', role: 'employee', password: '' });
      await loadOrders(); // refresh deliverymen if delivery role
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to create staff');
    } finally {
      setCreatingStaff(false);
    }
  };

  const toggleBlock = async (u: AdminUser) => {
    setMsg(null);
    try {
      setBusyUserId(u._id);
      const reason = !u.isBlocked ? window.prompt('Reason for blocking (optional):') || '' : '';
      await blockUserRequest(u._id, !u.isBlocked, reason);
      setMsg(`✅ User ${!u.isBlocked ? 'blocked' : 'unblocked'}`);
      await loadUsers();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = async (userId: string, name: string) => {
    setMsg(null);
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      setBusyUserId(userId);
      await deleteUserRequest(userId);
      setMsg('✅ User deleted');
      await loadUsers();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteProduct = async (productId: string, name: string) => {
    setMsg(null);
    if (!window.confirm(`Delete product "${name}"? This cannot be undone.`)) return;
    try {
      setBusyProductId(productId);
      await deleteProductRequest(productId);
      setMsg('✅ Product deleted');
      await loadProducts();
      await loadLowRated();
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed');
    } finally {
      setBusyProductId(null);
    }
  };

  const sendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      setSendingOffer(true);
      const payload = {
        mode: offerMode,
        subject: offerSubject,
        title: offerTitle,
        message: offerMessage,
        ...(offerMode === 'role' ? { role: offerRole } : {}),
        ...(offerMode === 'single' ? { email: offerEmail } : {}),
      };
      const res = await sendOfferEmailRequest(payload as any);
      setMsg(`✅ ${res.message}`);
      setOfferSubject('');
      setOfferTitle('');
      setOfferMessage('');
      setOfferEmail('');
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingOffer(false);
    }
  };

  // ─── Tabs ─────────────────────────────────────────
  const employeeTabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: 'Delivery Assignment' },
  ];

  const adminTabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: 'Delivery Assignment' },
    { key: 'sellers', label: 'Seller Approvals' },
    { key: 'staff', label: 'Create Staff' },
    { key: 'email', label: 'Send Email' },
    { key: 'users', label: 'Manage Users' },
    { key: 'products', label: 'Manage Products' },
    { key: 'alerts', label: `Low Rating Alerts${lowRated.length > 0 ? ` (${lowRated.length})` : ''}` },
  ];

  const tabs = isAdmin ? adminTabs : employeeTabs;

  // ─── Render ───────────────────────────────────────
  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <h1>{isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}</h1>
        <p className="muted">Logged in as: {user?.name} ({user?.role})</p>
      </div>

      {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="tabs-row">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tabbtn ${tab === t.key ? 'active' : ''}`}
            onClick={() => { setTab(t.key); setMsg(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Delivery Assignment ─────────────────── */}
      {tab === 'orders' && (
        <div className="dash-card">
          <h2>Orders Waiting for Delivery Assignment</h2>
          {orders.length === 0 ? (
            <p className="muted">No orders waiting assignment.</p>
          ) : (
            <div className="list">
              {orders.map((o) => (
                <div className="review-card" key={o._id}>
                  <div className="review-top">
                    <div className="list-title">Order #{o._id.slice(-6)} ({o.status})</div>
                    <div className="pill">৳{o.totalAmount}</div>
                  </div>
                  <div className="muted">Buyer: {o.buyer?.name} ({o.buyer?.phone})</div>
                  <div className="muted">Seller: {o.seller?.name}</div>
                  <div className="muted">Items: {o.items.map((it) => `${it.name} x${it.quantity}`).join(', ')}</div>
                  <div className="rowgap" style={{ marginTop: 10 }}>
                    <select
                      value={selected[o._id] || ''}
                      onChange={(e) => setSelected((p) => ({ ...p, [o._id]: e.target.value }))}
                    >
                      <option value="">Auto-pick (server)</option>
                      {deliverymen.map((d) => (
                        <option key={d._id} value={d._id}>{d.name} ({d.email})</option>
                      ))}
                    </select>
                    <button className="pill green" onClick={() => assign(o._id)}>Assign</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Seller Approvals ────────────────────── */}
      {isAdmin && tab === 'sellers' && (
        <div className="dash-card">
          <h2>Pending Seller Approvals</h2>
          {pendingSellers.length === 0 ? (
            <p className="muted">No pending sellers.</p>
          ) : (
            <div className="list">
              {pendingSellers.map((s) => (
                <div className="list-item" key={s._id} style={{ alignItems: 'center' }}>
                  <div>
                    <div className="list-title">{s.name}</div>
                    <div className="muted">{s.email}</div>
                  </div>
                  <button
                    className="pill green"
                    disabled={busySellerId === s._id}
                    onClick={() => approveSeller(s._id)}
                  >
                    {busySellerId === s._id ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Create Staff ────────────────────────── */}
      {isAdmin && tab === 'staff' && (
        <div className="dash-card">
          <h2>Create Staff / Delivery / Admin Account</h2>
          <p className="muted">Login credentials will be sent to the new user via email.</p>
          <form className="form" onSubmit={createStaff}>
            <label>
              Full Name
              <input value={staffForm.name} onChange={(e) => setStaffForm((p) => ({ ...p, name: e.target.value }))} required />
            </label>
            <label>
              Email
              <input type="email" value={staffForm.email} onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))} required />
            </label>
            <label>
              Role
              <select value={staffForm.role} onChange={(e) => setStaffForm((p) => ({ ...p, role: e.target.value as StaffRole }))}>
                <option value="employee">Employee</option>
                <option value="delivery">Deliveryman</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Temporary Password (optional — auto-generated if blank)
              <input value={staffForm.password} onChange={(e) => setStaffForm((p) => ({ ...p, password: e.target.value }))} placeholder="Leave blank to auto-generate" />
            </label>
            <button className="btn-primary" type="submit" disabled={creatingStaff}>
              {creatingStaff ? 'Creating...' : 'Create Account & Send Email'}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Send Offer/Custom Email ─────────────── */}
      {isAdmin && tab === 'email' && (
        <div className="dash-card">
          <h2>Send Offer / Custom Email</h2>
          <form className="form" onSubmit={sendOffer}>
            <label>
              Send to
              <select value={offerMode} onChange={(e) => setOfferMode(e.target.value as OfferMode)}>
                <option value="all">All users</option>
                <option value="role">By role</option>
                <option value="single">Single user (by email)</option>
              </select>
            </label>

            {offerMode === 'role' && (
              <label>
                Role
                <select value={offerRole} onChange={(e) => setOfferRole(e.target.value as OfferRole)}>
                  <option value="buyer">Buyers</option>
                  <option value="seller">Sellers</option>
                  <option value="employee">Employees</option>
                  <option value="delivery">Deliverymen</option>
                  <option value="admin">Admins</option>
                </select>
              </label>
            )}

            {offerMode === 'single' && (
              <label>
                User Email
                <input type="email" value={offerEmail} onChange={(e) => setOfferEmail(e.target.value)} required />
              </label>
            )}

            <label>
              Email Subject
              <input value={offerSubject} onChange={(e) => setOfferSubject(e.target.value)} required />
            </label>
            <label>
              Email Title
              <input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} required />
            </label>
            <label>
              Message
              <textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} required />
            </label>

            <button className="btn-primary" type="submit" disabled={sendingOffer}>
              {sendingOffer ? 'Sending...' : 'Send Email'}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Manage Users ────────────────────────── */}
      {isAdmin && tab === 'users' && (
        <div className="dash-card">
          <h2>Manage Users</h2>

          <div className="rowgap" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search name / email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="employee">Employee</option>
              <option value="delivery">Delivery</option>
              <option value="admin">Admin</option>
            </select>
            <button className="pill" onClick={loadUsers}>Search</button>
          </div>

          {allUsers.length === 0 ? (
            <p className="muted">No users found.</p>
          ) : (
            <div className="list">
              {allUsers.map((u) => (
                <div className="list-item" key={u._id} style={{ alignItems: 'center' }}>
                  <div>
                    <div className="list-title">{u.name} <span className="pill" style={{ marginLeft: 6 }}>{u.role}</span></div>
                    <div className="muted">{u.email}</div>
                    {u.isBlocked && (
                      <div className="muted" style={{ color: '#ef4444' }}>
                        Blocked{u.blockedReason ? `: ${u.blockedReason}` : ''}
                      </div>
                    )}
                  </div>

                  <div className="rowgap">
                    <button
                      className={`pill ${u.isBlocked ? 'green' : 'red'}`}
                      disabled={busyUserId === u._id}
                      onClick={() => toggleBlock(u)}
                    >
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button
                      className="pill red"
                      disabled={busyUserId === u._id}
                      onClick={() => deleteUser(u._id, u.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Manage Products ─────────────────────── */}
      {isAdmin && tab === 'products' && (
        <div className="dash-card">
          <h2>Manage Products</h2>

          <div className="rowgap" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search product name"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="pill" onClick={loadProducts}>Search</button>
          </div>

          {allProducts.length === 0 ? (
            <p className="muted">No products found.</p>
          ) : (
            <div className="list">
              {allProducts.map((p) => (
                <div className="list-item" key={p._id} style={{ alignItems: 'center' }}>
                  <div>
                    <div className="list-title">{p.name}</div>
                    <div className="muted">৳{p.price} • ⭐ {p.ratingAverage} ({p.ratingCount}) • Seller: {p.seller?.name}</div>
                  </div>
                  <button
                    className="pill red"
                    disabled={busyProductId === p._id}
                    onClick={() => deleteProduct(p._id, p.name)}
                  >
                    {busyProductId === p._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Low Rating Alerts ───────────────────── */}
      {isAdmin && tab === 'alerts' && (
        <div className="dash-card">
          <h2>Low Rating Alerts</h2>
          <p className="muted">Products with average rating below 1.0 and at least 3 reviews.</p>
          <button className="pill" style={{ marginBottom: 12 }} onClick={loadLowRated}>Refresh</button>

          {loadingLow ? (
            <p className="muted">Loading...</p>
          ) : lowRated.length === 0 ? (
            <p className="muted">No low-rated products found.</p>
          ) : (
            <div className="list">
              {lowRated.map((p) => (
                <div className="list-item" key={p._id} style={{ alignItems: 'center' }}>
                  <div>
                    <div className="list-title" style={{ color: '#ef4444' }}>{p.name}</div>
                    <div className="muted">⭐ {p.ratingAverage} ({p.ratingCount} reviews) • Seller: {p.seller?.name} ({p.seller?.email})</div>
                  </div>
                  <button
                    className="pill red"
                    disabled={busyProductId === p._id}
                    onClick={() => deleteProduct(p._id, p.name)}
                  >
                    Remove Product
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;