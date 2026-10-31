import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

export const ConfirmLogoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-badge warning">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3>Sign Out</h3>
              <p className="modal-subtitle">Terminate current member session</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            Are you sure you want to log out{userName ? `, ${userName}` : ''}?
            Any unsaved deposit forecasts will be cleared.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <LogOut size={16} />
            <span>Confirm Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
