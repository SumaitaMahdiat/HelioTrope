import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const SellerPendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  useEffect(() => {
    // if opened directly without state, just show page anyway
    // but you can redirect if you prefer
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h1 style={{ marginTop: 0 }}>Seller account pending approval</h1>
        <p className="muted">
          {email ? (
            <>
              Your seller email <b>{email}</b> is verified, but your seller profile needs admin approval before you can login and add
              products.
            </>
          ) : (
            <>Your seller account needs admin approval before you can login and add products.</>
          )}
        </p>

        <div className="dash-card" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>What happens next?</div>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Admin reviews your seller registration</li>
            <li>You’ll receive an email when approved</li>
            <li>Then you can login and start adding products</li>
          </ul>
        </div>

        <div style={{ marginTop: 14 }}>
          <Link to="/auth" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerPendingPage;