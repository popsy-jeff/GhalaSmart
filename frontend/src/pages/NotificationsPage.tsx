import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCheck,
  Smartphone,
  ShieldCheck,
  Eye,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import type { SmsNotification } from '../types';
import { fetchNotifications } from '../api';
import { SmsPreviewModal } from '../components/modals/SmsPreviewModal';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<SmsNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<SmsNotification | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.warn('Failed to fetch SMS logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filtered = notifications.filter(n => {
    if (filterType === 'ALL') return true;
    return n.event_type === filterType;
  });

  const handleOpenPreview = (item: SmsNotification) => {
    setSelectedNotification(item);
    setIsPreviewOpen(true);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">M-Pesa & SMS Message Center</h1>
          <p className="page-subtitle">
            Transparent communication logs dispatched via Africa's Talking & Safaricom Daraja API
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={16} />
          <span className="filter-label">Filter Category:</span>
          {(['ALL', 'WAREHOUSE_RECEIPT', 'ADVANCE_DISBURSED', 'SETTLEMENT_PAID', 'WELCOME'] as const).map(
            cat => (
              <button
                key={cat}
                type="button"
                className={`filter-btn ${filterType === cat ? 'active' : ''}`}
                onClick={() => setFilterType(cat)}
              >
                {cat === 'ALL'
                  ? 'All Alerts'
                  : cat === 'WAREHOUSE_RECEIPT'
                  ? 'Receipts'
                  : cat === 'ADVANCE_DISBURSED'
                  ? 'Cash Advances'
                  : cat === 'SETTLEMENT_PAID'
                  ? 'Settlements'
                  : 'Welcome'}
              </button>
            )
          )}
        </div>

        <button type="button" className="btn-sm btn-outline" onClick={loadNotifications}>
          Refresh Messages
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-list-card">
        {isLoading ? (
          <div className="table-loading-state">
            <Loader2 size={32} className="spin-icon" />
            <p>Loading cellular communication records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty-state">
            <MessageSquare size={40} className="empty-icon" />
            <h4>No Notifications Dispatched Yet</h4>
            <p>
              When you deposit grain, accept cash advances, or receive sale payouts, all automated SMS alerts
              will be permanently logged here for complete financial transparency.
            </p>
          </div>
        ) : (
          <div className="notifications-feed">
            {filtered.map(item => (
              <div
                key={item.id}
                className="notification-item-card"
                onClick={() => handleOpenPreview(item)}
              >
                <div className="notif-icon-col">
                  <div className={`notif-icon-bubble ${item.event_type.toLowerCase()}`}>
                    <Smartphone size={20} />
                  </div>
                </div>

                <div className="notif-content-col">
                  <div className="notif-top-row">
                    <span className="notif-sender">Sender: GHALASMART</span>
                    <span className="notif-type-pill">{item.event_type.replace('_', ' ')}</span>
                    <span className="notif-delivered-tag">
                      <CheckCheck size={14} /> Delivered
                    </span>
                  </div>

                  <p className="notif-text">{item.message}</p>

                  <div className="notif-bottom-row">
                    <span className="notif-date">
                      <Calendar size={13} /> {new Date(item.created_at).toLocaleString()}
                    </span>
                    <span className="notif-phone">Recipient: {item.phone_number}</span>
                    <span className="notif-inspect-hint">
                      <Eye size={13} /> Click to preview SMS bubble
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SMS Mobile Preview Modal */}
      <SmsPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        notification={selectedNotification}
      />
    </div>
  );
};
