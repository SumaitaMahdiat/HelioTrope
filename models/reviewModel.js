import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },
    images: [{ type: String }], // up to 3
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;