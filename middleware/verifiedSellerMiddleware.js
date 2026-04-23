import User from '../models/userModel.js';

export const requireVerifiedSeller = async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id).select('role isVerifiedSeller');
    if (!u) return res.status(401).json({ message: 'User not found' });

    if (u.role !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can do this' });
    }

    if (!u.isVerifiedSeller) {
      return res.status(403).json({ message: 'Seller account pending admin approval' });
    }

    next();
  } catch (e) {
    console.error('requireVerifiedSeller error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};