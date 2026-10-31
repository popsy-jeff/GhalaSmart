import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  PlusCircle,
  User,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Activity,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmLogoutModal } from './modals/ConfirmLogoutModal';

interface Props {
  onOpenDepositModal: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<Props> = ({
  onOpenDepositModal,
  isDarkTheme,
  onToggleTheme,
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Derive breadcrumb from current path
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard & Advisor';
    if (path.startsWith('/deposits')) return 'Warehouse Receipts';
    if (path.startsWith('/financing')) return 'Financing & Loan Ledger';
    if (path.startsWith('/notifications')) return 'M-Pesa & SMS Message Center';
    if (path.startsWith('/login')) return 'Member Sign In';
    if (path.startsWith('/register')) return 'Member Registration';
    return 'Overview';
  };

  return (
    <>
      <header className="top-navbar">
        {/* Left: Breadcrumbs & Status */}
        <div className="navbar-left">
          <div className="breadcrumb-trail">
            <span className="crumb-root">GhalaSmart</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-active">{getBreadcrumb()}</span>
          </div>

          <div className="live-engine-tag">
            <span className="engine-pulse"></span>
            <Activity size={13} />
            <span>AI Forecaster Online (KAMIS + agriBORA)</span>
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="navbar-right">
          {/* Quick Deposit Action Button */}
          {isAuthenticated && (
            <button
              type="button"
              className="btn-quick-deposit"
              onClick={onOpenDepositModal}
            >
              <PlusCircle size={16} />
              <span>New Deposit</span>
            </button>
          )}

          {/* Theme Switcher Button */}
          <button
            type="button"
            className="navbar-icon-btn"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Member Profile Menu */}
          {isAuthenticated && user ? (
            <div className="profile-dropdown-container">
              <button
                type="button"
                className="profile-pill-btn"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="profile-avatar">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
                </div>
                <div className="profile-text-meta">
                  <span className="profile-name">{user.full_name}</span>
                  <span className="profile-sub">{user.county}</span>
                </div>
                <ChevronDown size={14} className={`chevron-icon ${isProfileMenuOpen ? 'open' : ''}`} />
              </button>

              {isProfileMenuOpen && (
                <div className="profile-dropdown-menu" onClick={() => setIsProfileMenuOpen(false)}>
                  <div className="dropdown-user-header">
                    <strong>{user.full_name}</strong>
                    <div className="meta-badge-row">
                      <span className="meta-tag">
                        <MapPin size={11} /> {user.county}
                      </span>
                      <span className="meta-tag">
                        <Phone size={11} /> {user.phone_number}
                      </span>
                      <span className="meta-tag role">
                        <Shield size={11} /> {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <Link to="/deposits" className="dropdown-item">
                    <span>View My Receipts</span>
                  </Link>
                  <Link to="/financing" className="dropdown-item">
                    <span>Active Cash Advances</span>
                  </Link>
                  <Link to="/notifications" className="dropdown-item">
                    <span>SMS Delivery History</span>
                  </Link>

                  <div className="dropdown-divider"></div>

                  <button
                    type="button"
                    className="dropdown-item logout-item"
                    onClick={() => setIsLogoutModalOpen(true)}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-nav-buttons">
              <Link to="/login" className="btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        userName={user?.full_name}
      />
    </>
  );
};
