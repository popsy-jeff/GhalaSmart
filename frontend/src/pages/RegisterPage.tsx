import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Warehouse,
  User,
  Phone,
  Lock,
  MapPin,
  CreditCard,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchCounties } from '../api';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [county, setCounty] = useState('Uasin-Gishu');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [counties, setCounties] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCounties().then(list => {
      setCounties(list);
      if (list.length > 0 && !list.includes(county)) {
        setCounty(list[0]);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        county,
        password,
        national_id: nationalId.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card auth-card-wide">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Warehouse size={28} />
          </div>
          <h2>Join GhalaSmart Network</h2>
          <p className="auth-subtitle">
            Register as a certified grain depositor to access AI pricing and instant financing
          </p>
        </div>

        {error && (
          <div className="alert-box error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-grid">
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="reg-name"
                type="text"
                className="form-input"
                placeholder="e.g. Wanjiku Mwangi"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="form-group">
            <label htmlFor="reg-phone">M-Pesa Mobile Number</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input
                id="reg-phone"
                type="tel"
                className="form-input"
                placeholder="0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
            <span className="field-hint">Used for SMS warehouse receipts & M-Pesa payouts</span>
          </div>

          {/* Primary Farming County */}
          <div className="form-group">
            <label htmlFor="reg-county">Farming / Depot County</label>
            <div className="input-with-icon">
              <MapPin size={18} className="input-icon" />
              <select
                id="reg-county"
                className="form-select select-padded"
                value={county}
                onChange={e => setCounty(e.target.value)}
              >
                {counties.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* National ID (Optional) */}
          <div className="form-group">
            <label htmlFor="reg-national-id">National ID Number (Optional)</label>
            <div className="input-with-icon">
              <CreditCard size={18} className="input-icon" />
              <input
                id="reg-national-id"
                type="text"
                className="form-input"
                placeholder="e.g. 28492019"
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="reg-pwd">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="reg-pwd"
                type="password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="reg-confirm"
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-span-full">
            <button type="submit" className="btn-primary btn-block" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  <span>Creating Member Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Enter Granary</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In Here
            </Link>
          </p>
          <div className="auth-security-badge">
            <ShieldCheck size={14} />
            <span>Encrypted Member Profile &bull; Africa's Talking SMS Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
