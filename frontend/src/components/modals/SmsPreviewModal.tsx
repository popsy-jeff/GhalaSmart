import React from 'react';
import { X, MessageSquare, CheckCheck, Clock } from 'lucide-react';
import type { SmsNotification } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notification: SmsNotification | null;
}

export const SmsPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notification,
}) => {
  if (!isOpen || !notification) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-badge info">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3>Africa's Talking SMS Alert</h3>
              <p className="modal-subtitle">Automated Cellular Notification Delivery</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Simulated Mobile Phone Message Bubble */}
          <div className="sms-phone-mockup">
            <div className="sms-phone-header">
              <div className="sms-sender-avatar">GS</div>
              <div className="sms-sender-meta">
                <span className="sms-sender-name">GHALASMART</span>
                <span className="sms-sender-sub">Kenya SMS Gateway Verified</span>
              </div>
            </div>

            <div className="sms-bubble">
              <p className="sms-content">{notification.message}</p>
              <div className="sms-meta-row">
                <span className="sms-time">
                  <Clock size={11} /> {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="sms-delivered">
                  <CheckCheck size={14} /> Delivered
                </span>
              </div>
            </div>
          </div>

          <div className="sms-details-list">
            <div className="sms-detail-row">
              <span className="label">Recipient Phone:</span>
              <strong className="val">{notification.phone_number}</strong>
            </div>
            <div className="sms-detail-row">
              <span className="label">Event Category:</span>
              <span className="val badge-event">{notification.event_type}</span>
            </div>
            <div className="sms-detail-row">
              <span className="label">Gateway Status:</span>
              <span className="val status-pill-active">200 OK &bull; Delivered</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
