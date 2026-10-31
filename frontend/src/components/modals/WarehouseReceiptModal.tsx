import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';
import type { Deposit, Farmer } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deposit: Deposit | null;
  farmer?: Farmer | null;
}

export const WarehouseReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deposit,
  farmer,
}) => {
  if (!isOpen || !deposit) return null;

  const bags = (deposit.quantity_kg / 90.0).toFixed(1);
  const spotPrice = deposit.current_price_per_kg || 45.0;
  const totalValuation = (deposit.quantity_kg * spotPrice).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-lg printable-receipt" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-badge success">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3>Official Warehouse Receipt</h3>
              <p className="modal-subtitle">Certificated Collateral for Grain Collateralized Financing</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body receipt-certificate">
          <div className="certificate-frame">
            {/* Header banner */}
            <div className="certificate-header">
              <div className="cert-brand">
                <span className="cert-logo-text">GhalaSmart Granary Network</span>
                <span className="cert-sub">Licensed Collateral Warehouse System &bull; Republic of Kenya</span>
              </div>
              <div className="cert-serial">
                <span className="serial-label">Receipt Serial Number</span>
                <span className="serial-value">{deposit.receipt_number}</span>
              </div>
            </div>

            <div className="cert-divider"></div>

            {/* Grid of Details */}
            <div className="cert-grid">
              <div className="cert-section">
                <h4>Depositor Details</h4>
                <div className="cert-row">
                  <span className="label">Registered Farmer:</span>
                  <span className="val">{farmer?.full_name || 'Member Depositor'}</span>
                </div>
                <div className="cert-row">
                  <span className="label">Mobile Account:</span>
                  <span className="val">{farmer?.phone_number || 'Confidential'}</span>
                </div>
                <div className="cert-row">
                  <span className="label">Origin County:</span>
                  <span className="val">{deposit.county}</span>
                </div>
                <div className="cert-row">
                  <span className="label">Date of Custody:</span>
                  <span className="val">{deposit.deposit_date}</span>
                </div>
              </div>

              <div className="cert-section">
                <h4>Commodity & Grading</h4>
                <div className="cert-row">
                  <span className="label">Commodity:</span>
                  <span className="val">Dry White Maize (Zea mays)</span>
                </div>
                <div className="cert-row">
                  <span className="label">Inspection Grade:</span>
                  <span className="val badge-grade">{deposit.grade}</span>
                </div>
                <div className="cert-row">
                  <span className="label">Net Quantity:</span>
                  <span className="val highlight-val">{deposit.quantity_kg.toLocaleString()} kg (~{bags} bags)</span>
                </div>
                <div className="cert-row">
                  <span className="label">Certified Moisture:</span>
                  <span className="val">13.2% (KEBS Compliant)</span>
                </div>
              </div>
            </div>

            {/* Valuation & Advisory strip */}
            <div className="cert-valuation-strip">
              <div className="strip-item">
                <span className="strip-label">Certified Spot Price</span>
                <span className="strip-val">KES {spotPrice.toFixed(2)} / kg</span>
              </div>
              <div className="strip-item">
                <span className="strip-label">Current Collateral Value</span>
                <span className="strip-val highlight">KES {totalValuation}</span>
              </div>
              <div className="strip-item">
                <span className="strip-label">Warehouse Status</span>
                <span className="strip-val status-pill-active">
                  <CheckCircle2 size={14} /> {deposit.status}
                </span>
              </div>
            </div>

            {/* Footer with QR Code & Authorization Stamp */}
            <div className="cert-footer">
              <div className="qr-container">
                <div className="simulated-qr">
                  <QrCode size={64} />
                </div>
                <span className="qr-text">Scan to verify cryptographic authenticity</span>
              </div>
              <div className="cert-stamp">
                <div className="stamp-circle">
                  <span>GHALASMART</span>
                  <span className="stamp-date">{deposit.deposit_date}</span>
                  <span>VERIFIED</span>
                </div>
                <span className="stamp-signer">Authorized Granary Custodian</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Warehouse Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
