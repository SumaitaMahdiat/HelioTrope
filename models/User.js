import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ["buyer", "seller", "admin"] },
    name: { type: String, required: true, trim: true },
    sellerSocial: {
      fbPageId: { type: String },
      fbAccessToken: { type: String, select: false }, // Security: hidden by default
      igUserId: { type: String },
      igAccessToken: { type: String, select: false },
    },
    cart: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    purchaseHistory: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        purchasedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
