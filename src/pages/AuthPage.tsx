import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginRequest, registerRequest, forgotPasswordRequest } from '../services/authService';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showForgot, setShowForgot] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const data = await loginRequest({ email: form.email, password: form.password });

        if (data.requiresVerification) {
          navigate('/verify-otp', { state: { email: form.email } });
          return;
        }

        if (data.requiresSellerApproval) {
          navigate('/seller-pending', { state: { email: form.email } });
          return;
        }

        login(data.token, data.user);
        navigate('/');
      } else {
        const data = await registerRequest({
          name: form.name,
          email: form.email,
          password: form.password,
        });

        setMessage(data.message);
        setTimeout(() => navigate('/verify-otp', { state: { email: form.email } }), 800);
      }
    } catch (err: any) {
      const errorData = err?.response?.data;

      if (errorData?.requiresVerification) {
        navigate('/verify-otp', { state: { email: form.email } });
        return;
      }

      if (errorData?.requiresSellerApproval) {
        navigate('/seller-pending', { state: { email: form.email } });
        return;
      }

      setError(errorData?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await forgotPasswordRequest(forgotEmail);
      setMessage(data.message);

      setTimeout(() => navigate('/reset-password', { state: { email: forgotEmail } }), 800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' && !showForgot ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setShowForgot(false);
              setError(null);
              setMessage(null);
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' && !showForgot ? 'active' : ''}`}
            onClick={() => {
              setMode('signup');
              setShowForgot(false);
              setError(null);
              setMessage(null);
            }}
          >
            Sign Up
          </button>
        </div>

        {!showForgot ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div className="auth-field">
                  <label>Full Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>

                <div className="muted" style={{ marginTop: -6, marginBottom: 10 }}>
                  This creates a <b>Buyer</b> account. Want to sell? <Link to="/seller-signup">Register as a Seller</Link>
                </div>
              </>
            )}

            <div className="auth-field">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>

            {mode === 'login' && (
              <div className="auth-footer-row">
                <button type="button" className="auth-link-button" onClick={() => setShowForgot(true)}>
                  Forgot password?
                </button>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-message">{message}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Buyer Account'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleForgot}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Reset Password</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              Enter your email and we&apos;ll send you an OTP to reset your password.
            </p>

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-message">{message}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>

            <button
              type="button"
              className="auth-link-button"
              onClick={() => {
                setShowForgot(false);
                setError(null);
                setMessage(null);
              }}
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;