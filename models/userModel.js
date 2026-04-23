import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, default: '' },
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    postalCode: { type: String, default: '' },
  },
  { _id: false }
);

// IMPORTANT: keep _id so we can mark read by id
const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['order', 'review', 'offer', 'system'],
      default: 'system',
    },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    link: { type: String, default: '' }, // frontend route e.g. /dashboard?tab=orders
    read: { type: Boolean, default: false },
    meta: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['buyer', 'seller', 'delivery', 'employee', 'admin'],
      default: 'buyer',
    },

    isEmailVerified: { type: Boolean, default: false },

    emailVerificationOTP: String,
    emailVerificationOTPExpires: Date,

    passwordResetOTP: String,
    passwordResetOTPExpires: Date,

    phone: { type: String, default: '' },
    address: { type: addressSchema, default: () => ({}) },

    wishlist: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    closet: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    notifications: { type: [notificationSchema], default: [] },

    // keep space for notification management
    notificationPreferences: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },

      orderUpdates: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true }, // for admin offers
      system: { type: Boolean, default: true },
    },

    isVerifiedSeller: { type: Boolean, default: false },
    lastAssignedAt: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    blockedReason: { type: String, default: '' },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;