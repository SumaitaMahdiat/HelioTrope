import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, ShoppingBag, User, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">H</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Heliotrope</div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9ca3af' }}>
              Artisan Marketplace
            </div>
          </div>
        </div>

        <nav className="navbar-links">
          <Link to="/" className="navbar-link">Discover</Link>
          <button type="button" className="navbar-link" style={{ background: 'none', border: 'none' }}>
            Shop
          </button>
          <Link to="/" className="navbar-link">Sellers</Link>
          <button type="button" className="navbar-link" style={{ background: 'none', border: 'none' }}>
            <Radio size={16} color="#ef4444" style={{ marginRight: 4 }} />
            Live
          </button>
        </nav>

        <div className="navbar-actions">
          {/* Removed Search icon button */}
          <button type="button" className="navbar-icon-btn"><Bell size={18} /></button>
          <button type="button" className="navbar-icon-btn"><Heart size={18} /></button>
          <button type="button" className="navbar-icon-btn"><ShoppingBag size={18} /></button>

          {!user ? (
            <Link to="/auth" className="navbar-pill-btn">
              <User size={16} /> Login
            </Link>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-pill-btn">
                <User size={16} /> Profile
              </Link>
              <button type="button" className="navbar-pill-btn" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;