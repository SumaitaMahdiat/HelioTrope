import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifyOTPRequest, resendOTPRequest } from '../services/authService';

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) navigate('/auth');
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await verifyOTPRequest({ email, otp });
      setMessage(data.message);

      // seller: pending admin approval
      if (data.requiresSellerApproval) {
        setTimeout(() => navigate('/seller-pending', { state: { email } }), 800);
        return;
      }

      // buyer/others: auto login
      if (data.token && data.user) {
        login(data.token, data.user);
        setTimeout(() => navigate('/'), 800);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await resendOTPRequest(email);
      setMessage(data.message);
      setCountdown(60);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Verify Your Email</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            We&apos;ve sent a 6-digit OTP to<br />
            <strong>{email}</strong>
          </p>
        </div>

        <form className="auth-form" onSubmit={handleVerify}>
          <div className="auth-field">
            <label>Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontFamily: 'monospace' }}
              required
              autoFocus
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="auth-submit" type="submit" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            {countdown > 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Resend OTP in {countdown}s</p>
            ) : (
              <>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Didn&apos;t receive the code?</p>
                <button type="button" className="auth-link-button" onClick={handleResend} disabled={loading}>
                  Resend OTP
                </button>
              </>
            )}
          </div>

          <button type="button" className="auth-link-button" onClick={() => navigate('/auth')} style={{ marginTop: '16px' }}>
            ← Back to login
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;