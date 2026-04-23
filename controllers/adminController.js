import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { sendEmail, emailTemplates } from '../utils/email.js';

// ─── Seller approvals ────────────────────────────────────────────
export const listPendingSellers = async (req, res) => {
  try {
    const sellers = await User.find({
      role: 'seller',
      isEmailVerified: true,
      isVerifiedSeller: false,
    })
      .select('_id name email isEmailVerified isVerifiedSeller createdAt')
      .sort({ createdAt: -1 });

    res.json({ sellers });
  } catch (e) {
    console.error('listPendingSellers error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveSeller = async (req, res) => {
  try {
    const { userId } = req.params;

    const seller = await User.findById(userId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    if (seller.role !== 'seller') return res.status(400).json({ message: 'User is not a seller' });
    if (!seller.isEmailVerified) return res.status(400).json({ message: 'Seller email is not verified yet' });
    if (seller.isVerifiedSeller) return res.status(400).json({ message: 'Seller is already approved' });

    seller.isVerifiedSeller = true;

    seller.notifications.unshift({
      type: 'system',
      title: 'Seller account approved',
      body: 'Congratulations! Your seller account has been approved. You can now login and start adding products.',
      link: '/auth',
      meta: { kind: 'SELLER_APPROVED' },
      read: false,
      createdAt: new Date(),
    });
    if (seller.notifications.length > 50) seller.notifications = seller.notifications.slice(0, 50);

    await seller.save();

    sendEmail({
      to: seller.email,
      subject: 'Your Seller Account Has Been Approved - Heliotrope',
      html: emailTemplates.sellerApproved
        ? emailTemplates.sellerApproved(seller.name)
        : `<p>Hi ${seller.name}, your seller account has been approved.</p>`,
    }).catch(() => {});

    res.json({
      message: 'Seller approved',
      seller: { id: seller._id, name: seller.name, email: seller.email, isVerifiedSeller: true },
    });
  } catch (e) {
    console.error('approveSeller error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 1: create staff / delivery / admin ───────────────────
export const createStaffUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'name, email, role are required' });
    }

    if (!['employee', 'delivery', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role must be employee, delivery, or admin' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const plain =
      password && String(password).trim().length >= 6
        ? String(password).trim()
        : Math.random().toString(36).slice(2, 10) + 'A1!';

    const hashed = await bcrypt.hash(plain, 10);

    const user = await User.create({
      name,
      email: String(email).toLowerCase().trim(),
      password: hashed,
      role,
      isEmailVerified: true,
    });

    sendEmail({
      to: user.email,
      subject: 'Your Heliotrope Staff Account',
      html: emailTemplates.generic
        ? emailTemplates.generic(
            'Your Staff Account is Ready',
            `<p>Hello <b>${user.name}</b>,</p>
             <p>An account has been created for you as <b>${role}</b>.</p>
             <p><b>Login email:</b> ${user.email}<br/>
             <b>Temporary password:</b> ${plain}</p>
             <p>Please login and change your password immediately.</p>
             <a href="${process.env.CLIENT_URL}/auth">Login here</a>`
          )
        : `<p>Login: ${user.email} | Temp password: ${plain}</p>`,
    }).catch(() => {});

    res.status(201).json({
      message: 'User created and credentials emailed',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error('createStaffUser error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 2: block / unblock user ─────────────────────────────
export const setBlockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked, reason } = req.body;

    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (String(u._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'Admin cannot block themselves' });
    }

    const b = Boolean(blocked);
    u.isBlocked = b;
    u.blockedReason = b ? String(reason || '') : '';
    u.blockedAt = b ? new Date() : null;
    u.blockedBy = b ? req.user._id : null;

    u.notifications.unshift({
      type: 'system',
      title: b ? 'Account blocked' : 'Account unblocked',
      body: b
        ? `Your account has been blocked.${u.blockedReason ? ' Reason: ' + u.blockedReason : ''}`
        : 'Your account has been unblocked. You may now login.',
      link: '/auth',
      meta: { kind: b ? 'BLOCKED' : 'UNBLOCKED' },
      read: false,
      createdAt: new Date(),
    });
    if (u.notifications.length > 50) u.notifications = u.notifications.slice(0, 50);

    await u.save();

    res.json({ message: b ? 'User blocked' : 'User unblocked' });
  } catch (e) {
    console.error('setBlockUser error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 3: delete product / delete user ──────────────────────
export const deleteProductByAdmin = async (req, res) => {
  try {
    const { productId } = req.params;

    const p = await Product.findById(productId);
    if (!p) return res.status(404).json({ message: 'Product not found' });

    await p.deleteOne();
    res.json({ message: 'Product removed' });
  } catch (e) {
    console.error('deleteProductByAdmin error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ message: 'User not found' });

    if (String(u._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'Admin cannot delete themselves' });
    }

    await u.deleteOne();
    res.json({ message: 'User removed' });
  } catch (e) {
    console.error('deleteUserByAdmin error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 4: send offer / custom email ────────────────────────
export const sendOfferEmail = async (req, res) => {
  try {
    const { subject, title, message, mode, role, email } = req.body;

    if (!subject || !title || !message) {
      return res.status(400).json({ message: 'subject, title, message are required' });
    }

    if (!['all', 'role', 'single'].includes(mode)) {
      return res.status(400).json({ message: "mode must be 'all', 'role', or 'single'" });
    }

    let query = {};

    if (mode === 'role') {
      if (!role || !['buyer', 'seller', 'employee', 'admin', 'delivery'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role filter' });
      }
      query = { role };
    }

    if (mode === 'single') {
      if (!email) return res.status(400).json({ message: 'email is required for single mode' });
      query = { email: String(email).toLowerCase().trim() };
    }

    const users = await User.find(query).select('_id email name notificationPreferences notifications');

    if (mode === 'single' && users.length === 0) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    const emailJobs = users.map((u) => {
      const prefs = u.notificationPreferences || {};
      if (prefs.email === false || prefs.promotions === false) return Promise.resolve();

      return sendEmail({
        to: u.email,
        subject,
        html: emailTemplates.specialOffer
          ? emailTemplates.specialOffer({ title, message })
          : `<h2>${title}</h2><p>${message}</p>`,
      }).catch(() => {});
    });

    const notifJobs = users.map(async (u) => {
      const prefs = u.notificationPreferences || {};
      if (prefs.inApp === false || prefs.promotions === false) return;

      u.notifications.unshift({
        type: 'offer',
        title,
        body: message,
        link: '/',
        meta: { kind: 'OFFER' },
        read: false,
        createdAt: new Date(),
      });
      if (u.notifications.length > 50) u.notifications = u.notifications.slice(0, 50);
      await u.save();
    });

    await Promise.allSettled([...emailJobs, ...notifJobs]);

    res.json({ message: `Email sent to ${users.length} user(s)` });
  } catch (e) {
    console.error('sendOfferEmail error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 5: list low rated products (admin in-app alert only) ─
export const listLowRatedProducts = async (req, res) => {
  try {
    const minCount = Math.max(1, Number(req.query.minCount || 3));
    const threshold = Number(req.query.threshold || 1);

    const products = await Product.find({
      ratingCount: { $gte: minCount },
      ratingAverage: { $lt: threshold },
    })
      .populate('seller', 'name email')
      .sort({ ratingAverage: 1, ratingCount: -1 });

    res.json({ products, threshold, minCount });
  } catch (e) {
    console.error('listLowRatedProducts error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 3 extra: list all users (for admin panel) ───────────
export const listAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const q = {};
    if (role) q.role = String(role);
    if (search) q.$or = [
      { name: { $regex: String(search), $options: 'i' } },
      { email: { $regex: String(search), $options: 'i' } },
    ];

    const users = await User.find(q)
      .select('_id name email role isEmailVerified isVerifiedSeller isBlocked blockedReason createdAt')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (e) {
    console.error('listAllUsers error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature 3 extra: list all products (for admin panel) ─────────
export const listAllProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const q = {};
    if (search) q.$or = [{ name: { $regex: String(search), $options: 'i' } }];

    const products = await Product.find(q)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    res.json({ products });
  } catch (e) {
    console.error('listAllProducts error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};