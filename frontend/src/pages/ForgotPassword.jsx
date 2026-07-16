import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = verify identity, 2 = set new password
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-recovery', { name, email, mobile });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify account details');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { name, email, mobile, newPassword });
      setSuccess('Password updated successfully. You can now sign in.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Interest Book</h1>
        <p className="auth-subtitle">
          {step === 1 ? 'Confirm your account details' : 'Set a new password'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{ background: '#e6f4ea', color: '#1e8e3e' }}>{success}</div>}

        {step === 1 && !success && (
          <form onSubmit={handleVerify}>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && !success && (
          <form onSubmit={handleReset}>
            <input
              type="password"
              placeholder="New Password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}