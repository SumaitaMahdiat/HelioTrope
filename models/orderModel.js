import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],

    phone: { type: String, required: true },
    shippingAddress: {
      line1: { type: String, required: true },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    instructions: { type: String, default: '' },

    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: [
        'PendingSeller',
        'Accepted',
        'Rejected',
        'AssignedDelivery',
        'InTransit',
        'Delivered',
        'NotReceived',
        'Cancelled',
      ],
      default: 'PendingSeller',
    },

    deliveryman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedByEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    acceptedAt: { type: Date, default: null },
    assignedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },

    // cancellation fields (your controller already sets these)
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;