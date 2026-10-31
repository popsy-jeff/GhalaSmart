import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Warehouse,
  LayoutDashboard,
  Wallet,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Warehouse size={24} />
        </div>
        <div className="logo-text">
          <span className="brand-name">GhalaSmart</span>
          <span className="brand-tag">Grain Intelligence</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard & Advisor</span>
        </NavLink>

        <NavLink
          to="/deposits"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Warehouse size={20} />
          <span>Warehouse Receipts</span>
        </NavLink>

        <NavLink
          to="/financing"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Wallet size={20} />
          <span>Financing & Advances</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          <span>M-Pesa & SMS Log</span>
        </NavLink>
      </nav>

      {/* Market Intelligence Pill */}
      <div className="sidebar-info-card">
        <div className="info-header">
          <TrendingUp size={16} />
          <span>AI Market Forecast</span>
        </div>
        <p className="info-desc">
          Trained on Kenyan KAMIS & agriBORA wholesale maize pricing models.
        </p>
        <div className="info-status">
          <span className="status-dot"></span>
          <span>46 Counties Synchronized</span>
        </div>
      </div>

      {/* Authenticated Member Footer Card */}
      {isAuthenticated && user && (
        <div className="sidebar-member-badge">
          <div className="badge-avatar">
            <Award size={18} />
          </div>
          <div className="badge-info">
            <span className="badge-title">Verified Depositor</span>
            <span className="badge-name">{user.full_name}</span>
          </div>
        </div>
      )}

      {/* Security Accreditation */}
      <div className="sidebar-footer">
        <ShieldCheck size={14} />
        <span>Safaricom Daraja B2C Ready</span>
      </div>
    </aside>
  );
};
