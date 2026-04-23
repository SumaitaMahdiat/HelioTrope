import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import StarRating from '../components/StarRating';
import { fetchProductById } from '../services/productService';
import { canReviewProduct, submitProductReview } from '../services/reviewService';

const ProductReviewPage: React.FC = () => {
  const { id } = useParams();
  const productId = id as string;

  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const p = await fetchProductById(productId);
      setProduct(p.product || p);

      const cr = await canReviewProduct(productId);
      setAllowed(!!cr.canReview);
    };

    load().catch((e: any) => setMsg(e?.response?.data?.message || 'Failed to load'));
  }, [productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!rating) return setMsg('Please select a star rating');
    if (text.trim().length < 5) return setMsg('Review text too short (min 5 characters)');
    if (files.length > 3) return setMsg('Max 3 images allowed');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('rating', String(rating));
      fd.append('text', text.trim());
      files.forEach((f) => fd.append('images', f)); // optional

      await submitProductReview(productId, fd);

      setMsg('✅ Review submitted!');
      setTimeout(() => navigate(`/products/${productId}`), 800);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="dash-wrap">
        <div className="dash-card" style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1>Write a Review</h1>

          {product && (
            <div className="muted" style={{ marginBottom: 12 }}>
              Product: <b>{product.name}</b> • <Link to={`/products/${productId}`}>Back to product</Link>
            </div>
          )}

          {allowed === false && (
            <div className="nores">
              <div className="nores-title">You can’t review this product</div>
              <div className="muted">You can review only after delivery and only once.</div>
              <Link className="btn-primary" to="/dashboard">Go to dashboard</Link>
            </div>
          )}

          {allowed !== false && (
            <form className="form" onSubmit={submit}>
              <label>
                Rating
                <div style={{ marginTop: 8 }}>
                  <StarRating value={rating} onChange={setRating} />
                </div>
              </label>

              <label>
                Review Text
                <textarea value={text} onChange={(e) => setText(e.target.value)} required />
              </label>

              <label>
                Upload photos (optional, max 3)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
                />
              </label>

              {msg && <div className="ok">{msg}</div>}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductReviewPage;