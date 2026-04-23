import React, { useEffect, useMemo, useState } from 'react';
import { searchProducts } from '../services/searchService';
import { Link } from 'react-router-dom';
import { useSearchUI } from '../context/SearchContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

const RECENT_KEY = 'heliotrope_recent_searches';

const trending = ['Eid collection', 'Handmade pottery', 'Silk saree', 'Boho jewelry'];
const categories = ['All', 'Fashion', 'Jewelry', 'Handmade', 'Home', 'Beauty', 'Art', 'Food', 'Other'];
const districts = ['All', 'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'];

const SearchModal: React.FC<Props> = ({ open, onClose }) => {
  const { initialQuery } = useSearchUI();

  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [category, setCategory] = useState('All');
  const [district, setDistrict] = useState('All');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  const [sort, setSort] = useState<'relevance'|'mostPopular'|'newest'|'priceAsc'|'priceDesc'|'highestRated'>('relevance');

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) setRecent(JSON.parse(raw));
  }, []);

  const saveRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const resetFilters = () => {
    setCategory('All');
    setDistrict('All');
    setMinPrice(0);
    setMaxPrice(10000);
    setMinRating(0);
    setVerifiedOnly(false);
    setInStockOnly(false);
    setSort('relevance');
  };

  const doSearch = async (term?: string) => {
    const query = (term ?? q).trim();
    setQ(query);

    if (!query) {
      setProducts([]);
      setSellers([]);
      setTotalProducts(0);
      return;
    }

    setLoading(true);
    try {
      const data = await searchProducts({
        q: query,
        category: category === 'All' ? undefined : category,
        district: district === 'All' ? undefined : district,
        minPrice,
        maxPrice,
        minRating: minRating > 0 ? minRating : undefined,
        verifiedOnly,
        inStockOnly,
        sort,
        page: 1,
        limit: 20,
      });

      setProducts(data.products.items || []);
      setTotalProducts(data.products.total || 0);
      setSellers(data.sellers.items || []);

      saveRecent(query);
    } finally {
      setLoading(false);
    }
  };

  // When modal opens, preload and auto-search if homepage provided an initialQuery
  useEffect(() => {
    if (!open) return;
    setProducts([]);
    setSellers([]);
    setTotalProducts(0);

    const init = (initialQuery || '').trim();
    setQ(init);

    if (init) {
      doSearch(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') onClose();
  };

  const empty = !loading && (products.length === 0 && sellers.length === 0) && q.trim().length > 0;

  if (!open) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-top">
          <div className="search-input-wrap">
            <span className="search-ico">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleEnter}
              placeholder="Search sellers, products, categories..."
              className="search-input"
              autoFocus
            />
          </div>

          <button className="search-filter-btn" onClick={() => setShowFilters((p) => !p)}>
            Filters {showFilters ? '▴' : '▾'}
          </button>

          <button className="search-close" onClick={onClose}>✕</button>
        </div>

        {showFilters && (
          <div className="search-filters">
            <div className="filter-block">
              <div className="filter-title">Category</div>
              <div className="chip-row">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`chip ${category === c ? 'active' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-grid">
              <div className="filter-block">
                <div className="filter-title">Location (District)</div>
                <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="filter-block">
                <div className="filter-title">Price (৳)</div>
                <div className="row">
                  <input className="input" type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} />
                  <span className="muted">to</span>
                  <input className="input" type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
                </div>
              </div>

              <div className="filter-block">
                <div className="filter-title">Min Rating</div>
                <div className="chip-row">
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      className={`chip ${minRating === r ? 'active' : ''}`}
                      onClick={() => setMinRating(r)}
                    >
                      {r === 0 ? 'Any' : `${r}★`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-block">
                <div className="filter-title">Options</div>
                <label className="check">
                  <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
                  Verified sellers only
                </label>
                <label className="check">
                  <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                  In stock only
                </label>
              </div>
            </div>

            <div className="filter-block">
              <div className="filter-title">Sort by</div>
              <div className="chip-row">
                {[
                  { k: 'relevance', label: 'Most Relevant' },
                  { k: 'mostPopular', label: 'Most Popular' },
                  { k: 'newest', label: 'Newest Arrivals' },
                  { k: 'priceAsc', label: 'Price: Low to High' },
                  { k: 'priceDesc', label: 'Price: High to Low' },
                  { k: 'highestRated', label: 'Highest Rated' },
                ].map((s) => (
                  <button key={s.k} className={`chip ${sort === s.k ? 'active' : ''}`} onClick={() => setSort(s.k as any)}>
                    {s.label}
                  </button>
                ))}
                <button className="chip ghost" onClick={resetFilters}>Reset all</button>
              </div>
            </div>
          </div>
        )}

        <div className="search-body">
          {q.trim().length === 0 && (
            <>
              <div className="search-section">
                <div className="search-label">Recent searches</div>
                <div className="chip-row">
                  {recent.length === 0 ? (
                    <span className="muted">No recent searches</span>
                  ) : (
                    recent.map((t) => (
                      <button key={t} className="chip" onClick={() => doSearch(t)}>{t}</button>
                    ))
                  )}
                </div>
              </div>

              <div className="search-section">
                <div className="search-label">Trending now</div>
                <div className="chip-row">
                  {trending.map((t) => (
                    <button key={t} className="chip" onClick={() => doSearch(t)}>🔥 {t}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {loading && <div className="muted">Searching...</div>}

          {empty && (
            <div className="nores">
              <div className="nores-title">No results found</div>
              <div className="muted">Try different keywords or adjust filters</div>
              <button className="btn-primary" onClick={resetFilters}>Clear Filters</button>
            </div>
          )}

          {(products.length > 0 || sellers.length > 0) && (
            <>
              <div className="search-results-head">
                <div className="muted">
                  Products: {totalProducts} • Sellers: {sellers.length}
                </div>
              </div>

              {sellers.length > 0 && (
                <div className="search-section">
                  <div className="search-label">Sellers</div>
                  <div className="results">
                    {sellers.map((s) => (
                      <div key={s._id} className="result-card">
                        <div className="result-title">{s.name}</div>
                        <div className="muted">
                          {s.address?.district || '—'} {s.isVerifiedSeller ? '• Verified' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {products.length > 0 && (
                <div className="search-section">
                  <div className="search-label">Products</div>
                  <div className="results">
                    {products.map((p) => (
                      <Link
                        to={`/products/${p._id}`}
                        key={p._id}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        onClick={onClose}
                      >
                        <div className="result-card">
                          <div className="result-title">{p.name}</div>
                          <div className="muted">
                            ৳{p.price} • ⭐ {p.ratingAverage} ({p.ratingCount}) • {p.seller?.name}
                            {p.seller?.isVerifiedSeller ? ' • Verified' : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="search-foot">
          <div className="muted">Press Enter to search • Esc to close</div>
          <button className="btn-primary" onClick={() => doSearch()}>Search</button>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;