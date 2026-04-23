// pages/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyResetOTPRequest, resetPasswordRequest, resendResetOTPRequest } from '../services/authService';

const ResetPassword: React.FC = () => {
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/auth');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await verifyResetOTPRequest({ email, otp });
      setMessage(data.message);
      setTimeout(() => {
        setStep('password');
        setMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await resetPasswordRequest({ email, otp, newPassword });
      setMessage(data.message);
      setTimeout(() => navigate('/auth'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await resendResetOTPRequest(email);
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
        {step === 'otp' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Reset Password</h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                We've sent a 6-digit OTP to<br />
                <strong>{email}</strong>
              </p>
            </div>

            <form className="auth-form" onSubmit={handleVerifyOTP}>
              <div className="auth-field">
                <label>Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    textAlign: 'center',
                    fontSize: '24px',
                    letterSpacing: '8px',
                    fontFamily: 'monospace',
                  }}
                  required
                  autoFocus
                />
              </div>

              {error && <div className="auth-error">{error}</div>}
              {message && <div className="auth-message">{message}</div>}

              <button className="auth-submit" type="submit" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                {countdown > 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    Resend OTP in {countdown}s
                  </p>
                ) : (
                  <>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                      Didn't receive the code?
                    </p>
                    <button
                      type="button"
                      className="auth-link-button"
                      onClick={handleResend}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => navigate('/auth')}
                style={{ marginTop: '16px' }}
              >
                ← Back to login
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
              <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Create New Password</h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Enter your new password below
              </p>
            </div>

            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="auth-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoFocus
                />
              </div>

              <div className="auth-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}
              {message && <div className="auth-message">{message}</div>}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;