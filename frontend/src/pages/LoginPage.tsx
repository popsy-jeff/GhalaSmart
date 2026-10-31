import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination path if redirected by ProtectedRoute
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        phone_number: phone.trim(),
        password,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your phone and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <img src="/logo.png" alt="GhalaSmart" className="auth-logo-img" />
          </div>
          <h2>Member Sign In</h2>
          <p className="auth-subtitle">Access your granary receipts, forecasts, and M-Pesa advances</p>
        </div>

        {error && (
          <div className="alert-box error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-phone">Registered Mobile Number</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input
                id="login-phone"
                type="tel"
                className="form-input"
                placeholder="0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            <span className="field-hint">Kenya mobile format (e.g. 0712345678 or +254712345678)</span>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Granary</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            New grain depositor?{' '}
            <Link to="/register" className="auth-link">
              Register New Account
            </Link>
          </p>
          <div className="auth-security-badge">
            <ShieldCheck size={14} />
            <span>Secured with JWT & bcrypt 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};
