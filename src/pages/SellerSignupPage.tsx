import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSellerRequest } from '../services/authService';

const SellerSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await registerSellerRequest(form);
      setMessage(data.message || 'Check your email for OTP.');
      setTimeout(() => navigate('/verify-otp', { state: { email: form.email } }), 800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Seller registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h1 style={{ marginTop: 0 }}>Start Selling on Heliotrope</h1>
        <p className="muted">
          You&apos;re registering as a <b>Seller</b>. First verify your email with OTP. Then your account will be reviewed by an admin
          before you can publish products.
        </p>

        <div className="muted" style={{ marginBottom: 14 }}>
          Already a user? <Link to="/auth">Login</Link>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label>Seller / Brand Name</label>
            <input name="name" value={form.name} onChange={onChange} required />
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={onChange} required />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Create Seller Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellerSignupPage;