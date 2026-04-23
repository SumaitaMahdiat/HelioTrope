import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { searchProducts } from '../services/searchService';

const categories = ['All', 'Fashion', 'Jewelry', 'Handmade', 'Home', 'Beauty', 'Art', 'Food', 'Other'];
const districts = ['All', 'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'];

const SearchPage: React.FC = () => {
  const [sp, setSp] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Read from URL
  const q = sp.get('q') || '';
  const category = sp.get('category') || 'All';
  const district = sp.get('district') || 'All';
  const minPrice = Number(sp.get('minPrice') || 0);
  const maxPrice = Number(sp.get('maxPrice') || 10000);
  const minRating = Number(sp.get('minRating') || 0);
  const verifiedOnly = sp.get('verifiedOnly') === 'true';
  const inStockOnly = sp.get('inStockOnly') === 'true';
  const sort = (sp.get('sort') as any) || 'relevance';
  const page = Number(sp.get('page') || 1);

  // Local input for q (so typing doesn't immediately refetch until Search)
  const [qInput, setQInput] = useState(q);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  const fetchData = async () => {
  setLoading(true);
  try {
    const data = await searchProducts({
      q,
      category: category === 'All' ? undefined : category,
      district: district === 'All' ? undefined : district,
      minPrice,
      maxPrice,
      minRating: minRating > 0 ? minRating : undefined,
      verifiedOnly,
      inStockOnly,
      sort,
      page,
      limit: 12,
    });

    // FIX: Access the nested products object
    setItems(data.products.items || []);
    setTotal(data.products.total || 0);
    setPages(data.products.pages || 1);
  } catch (error) {
    console.error('Search failed:', error);
    setItems([]);
    setTotal(0);
    setPages(1);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, district, minPrice, maxPrice, minRating, verifiedOnly, inStockOnly, sort, page]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (!value || value === 'All') next.delete(key);
    else next.set(key, value);
    next.set('page', '1'); // reset page whenever filter changes
    setSp(next);
  };

  const setBool = (key: string, val: boolean) => {
    const next = new URLSearchParams(sp);
    if (!val) next.delete(key);
    else next.set(key, 'true');
    next.set('page', '1');
    setSp(next);
  };

  const doSearch = () => {
    const next = new URLSearchParams(sp);
    if (!qInput.trim()) next.delete('q');
    else next.set('q', qInput.trim());
    next.set('page', '1');
    setSp(next);
  };

  const resetAll = () => {
    setSp(new URLSearchParams({}));
  };

  const gotoPage = (p: number) => {
    const next = new URLSearchParams(sp);
    next.set('page', String(p));
    setSp(next);
  };

  return (
    <>
      <Navbar />

      <div className="dash-wrap">
        <div className="dash-card">
          <h1 style={{ marginBottom: 10 }}>Search Products</h1>

          {/* Search bar */}
          <div className="hero-search" style={{ margin: 0 }}>
            <span style={{ color: '#9ca3af' }}>🔎</span>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search products..."
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
            <button className="hero-search-btn" type="button" onClick={doSearch}>
              Search
            </button>
          </div>

          {/* Filters */}
          <div style={{ marginTop: 14 }} className="dash-grid">
            <div className="dash-card" style={{ padding: 12 }}>
              <div className="section-kicker">Category</div>
              <div className="chip-row">
                {categories.map((c) => (
                  <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => updateParam('category', c)}>
                    {c}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="section-kicker">Location (District)</div>
                <select className="select" value={district} onChange={(e) => updateParam('district', e.target.value)}>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="section-kicker">Price</div>
                <div className="row">
                  <input className="input" type="number" value={minPrice} onChange={(e) => updateParam('minPrice', e.target.value)} />
                  <span className="muted">to</span>
                  <input className="input" type="number" value={maxPrice} onChange={(e) => updateParam('maxPrice', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="section-kicker">Min Rating</div>
                <div className="chip-row">
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <button key={r} className={`chip ${minRating === r ? 'active' : ''}`} onClick={() => updateParam('minRating', String(r))}>
                      {r === 0 ? 'Any' : `${r}★`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="section-kicker">Options</div>
                <label className="check">
                  <input type="checkbox" checked={verifiedOnly} onChange={(e) => setBool('verifiedOnly', e.target.checked)} />
                  Verified sellers only
                </label>
                <label className="check">
                  <input type="checkbox" checked={inStockOnly} onChange={(e) => setBool('inStockOnly', e.target.checked)} />
                  In stock only
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="section-kicker">Sort</div>
                <div className="chip-row">
                  <button className={`chip ${sort === 'relevance' ? 'active' : ''}`} onClick={() => updateParam('sort', 'relevance')}>Most Relevant</button>
                  <button className={`chip ${sort === 'mostPopular' ? 'active' : ''}`} onClick={() => updateParam('sort', 'mostPopular')}>Most Popular</button>
                  <button className={`chip ${sort === 'newest' ? 'active' : ''}`} onClick={() => updateParam('sort', 'newest')}>Newest</button>
                  <button className={`chip ${sort === 'priceAsc' ? 'active' : ''}`} onClick={() => updateParam('sort', 'priceAsc')}>Price ↑</button>
                  <button className={`chip ${sort === 'priceDesc' ? 'active' : ''}`} onClick={() => updateParam('sort', 'priceDesc')}>Price ↓</button>
                  <button className={`chip ${sort === 'highestRated' ? 'active' : ''}`} onClick={() => updateParam('sort', 'highestRated')}>Highest Rated</button>
                  <button className="chip ghost" onClick={resetAll}>Reset All</button>
                </div>
              </div>
            </div>

            <div className="dash-card" style={{ padding: 12 }}>
              <div className="muted" style={{ marginBottom: 10 }}>
                {loading ? 'Loading...' : `${total} result(s)`}
              </div>

              {(!loading && items.length === 0) ? (
                <div className="nores">
                  <div className="nores-title">No results found</div>
                  <div className="muted">Try different keywords or adjust filters</div>
                  <button className="btn-primary" onClick={resetAll}>Clear Filters</button>
                </div>
              ) : (
                <div className="products-grid">
                  {items.map((p) => (
                    <Link to={`/products/${p._id}`} key={p._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <article className="product-card">
                        <div className="product-image-placeholder">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            '👜'
                          )}
                        </div>
                        <div className="product-body">
                          <h3 className="product-title">{p.name}</h3>
                          <p className="product-store">
                            {p.seller?.name} {p.seller?.district ? `• ${p.seller.district}` : ''}
                            {p.seller?.isVerifiedSeller ? ' • Verified' : ''}
                          </p>
                          <div className="product-price-row">
                            <div>
                              <span className="product-new-price">৳{p.price}</span>
                            </div>
                            <div className="muted">⭐ {p.ratingAverage} ({p.ratingCount})</div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!loading && pages > 1 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                  <button className="pill" disabled={page <= 1} onClick={() => gotoPage(page - 1)}>
                    Prev
                  </button>
                  <div className="pill">Page {page} / {pages}</div>
                  <button className="pill" disabled={page >= pages} onClick={() => gotoPage(page + 1)}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchPage;