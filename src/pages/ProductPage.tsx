import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchProductById } from '../services/productService';
import { canReviewProduct, getProductReviews } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CheckoutDrawer from '../components/CheckoutDrawer';

type Review = {
  _id: string;
  rating: number;
  text: string;
  images: string[];
  buyer: { name: string };
  createdAt: string;
};

const ProductPage: React.FC = () => {
  const { id } = useParams();
  const productId = id as string;

  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allowed, setAllowed] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    // product endpoint now returns { product }
    const p = await fetchProductById(productId);
    setProduct(p.product || p);

    // reviews from new module
    const r = await getProductReviews(productId);
    setReviews(r.reviews || []);
  };

  const checkAllowed = async () => {
    if (!user || user.role !== 'buyer') return setAllowed(false);
    const data = await canReviewProduct(productId);
    setAllowed(!!data.canReview);
  };

  useEffect(() => {
    if (!productId) return;
    load().catch((e: any) => setMsg(e?.response?.data?.message || 'Failed to load product'));
    checkAllowed().catch(() => setAllowed(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user?.id]);

  const ratingSummary = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0]; // index 1..5 used
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating] += 1;
    });
    return counts;
  }, [reviews]);

  const addToCart = () => {
    if (!product) return;
    addItem(
      {
        productId: product._id,
        sellerId: product.seller?._id,
        name: product.name,
        price: product.price,
      },
      1
    );
    setMsg('✅ Added to cart');
  };

  const orderNow = () => {
    addToCart();
    setDrawerOpen(true);
  };

  if (!product) {
    return (
      <div className="dash-wrap">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="dash-wrap">
      <CheckoutDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="dash-card">
        <div className="product-header">
          <div>
            <h1>{product.name}</h1>
            <div className="muted">
              Seller: {product.seller?.name} • ⭐ {product.ratingAverage} ({product.ratingCount})
            </div>
            <div className="price">৳{product.price}</div>
            <p className="muted" style={{ marginTop: 10 }}>
              {product.description}
            </p>
          </div>

          <div className="rowgap">
            <button className="btn-primary" onClick={orderNow}>
              Order Now
            </button>
            <button className="btn-secondary" onClick={addToCart}>
              Add to Cart
            </button>

            {user?.role === 'buyer' && (
              allowed ? (
                <button className="pill green" onClick={() => navigate(`/products/${productId}/review`)}>
                  Write Review
                </button>
              ) : (
                <div className="muted" style={{ fontSize: 12 }}>
                  Review available after delivery (once).
                </div>
              )
            )}
          </div>
        </div>

        {msg && (
          <div className="ok" style={{ marginTop: 12 }}>
            {msg}
          </div>
        )}
      </div>

      <div className="dash-grid" style={{ marginTop: 18 }}>
        <div className="dash-card">
          <h2>Rating Breakdown</h2>
          <div className="muted">
            Average: ⭐ {product.ratingAverage} • Total: {product.ratingCount}
          </div>

          <div className="breakdown">
            {[5, 4, 3, 2, 1].map((st) => (
              <div className="break-row" key={st}>
                <span>{st}★</span>
                <div className="bar">
                  <div
                    className="barfill"
                    style={{
                      width: product.ratingCount ? `${(ratingSummary[st] / product.ratingCount) * 100}%` : '0%',
                    }}
                  />
                </div>
                <span className="muted">{ratingSummary[st]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <h2>Reviews</h2>

          <div style={{ marginTop: 14 }}>
            {reviews.length === 0 ? (
              <p className="muted">No reviews yet.</p>
            ) : (
              <div className="list">
                {reviews.map((r) => (
                  <div className="review-card" key={r._id}>
                    <div className="review-top">
                      <div className="list-title">{r.buyer?.name}</div>
                      <div className="pill">⭐ {r.rating}</div>
                    </div>
                    <div className="muted">{new Date(r.createdAt).toLocaleString()}</div>
                    <p style={{ marginTop: 8 }}>{r.text}</p>

                    {r.images?.length > 0 && (
                      <div className="img-row">
                        {r.images.map((u, idx) => (
                          <a href={u} target="_blank" key={idx} rel="noreferrer">
                            <img className="revimg" src={u} alt="review" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <Link className="muted" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;