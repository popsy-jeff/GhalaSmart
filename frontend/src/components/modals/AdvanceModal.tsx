import React, { useState } from 'react';
import { X, CheckCircle2, Smartphone, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import type { Deposit, AcceptAdvanceResponse } from '../../types';
import { acceptAdvance } from '../../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deposit: Deposit | null;
  defaultPhone?: string;
  onSuccess: (receipt: AcceptAdvanceResponse) => void;
}

export const AdvanceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deposit,
  defaultPhone = '',
  onSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AcceptAdvanceResponse | null>(null);

  if (!isOpen || !deposit) return null;

  const currentVal = (deposit.quantity_kg * (deposit.current_price_per_kg || 45.0));
  const advanceAmount = Math.round(currentVal * 0.60);

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await acceptAdvance(deposit.id, {
        phone_number: phoneNumber || defaultPhone,
      });
      setResult(response);
      onSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Failed to disburse advance via M-Pesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleResetAndClose}>
      <div className="modal-card modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-badge primary">
              <Smartphone size={22} />
            </div>
            <div>
              <h3>M-Pesa Cash Advance</h3>
              <p className="modal-subtitle">Instant B2C Disbursement &bull; Safaricom Daraja API</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleResetAndClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {result ? (
            /* Success Voucher */
            <div className="mpesa-voucher-card">
              <div className="voucher-top-badge">
                <CheckCircle2 size={28} className="voucher-icon" />
                <h4>Disbursement Successful</h4>
                <p>Funds dispatched directly to your mobile phone</p>
              </div>

              <div className="voucher-receipt-box">
                <div className="voucher-row highlight">
                  <span>M-Pesa Transaction Code</span>
                  <strong className="code-text">{result.mpesa_receipt}</strong>
                </div>
                <div className="voucher-row">
                  <span>Amount Credited</span>
                  <strong className="amount-text">KES {result.principal_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="voucher-row">
                  <span>Financing Rate</span>
                  <span>{(result.interest_rate * 100 * 4).toFixed(1)}% / month</span>
                </div>
                <div className="voucher-row">
                  <span>Collateral Receipt</span>
                  <span>#{deposit.receipt_number}</span>
                </div>
              </div>

              <div className="voucher-note">
                <p>An official SMS confirmation has been logged to your message center.</p>
              </div>
            </div>
          ) : (
            /* Disbursement Form */
            <form onSubmit={handleDisburse}>
              <div className="advance-summary-card">
                <div className="summary-col">
                  <span className="summary-label">Stored Collateral</span>
                  <span className="summary-val">{deposit.quantity_kg.toLocaleString()} kg ({deposit.grade})</span>
                </div>
                <div className="summary-col">
                  <span className="summary-label">Current Valuation</span>
                  <span className="summary-val">KES {currentVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="summary-col highlight">
                  <span className="summary-label">Instant 60% Advance</span>
                  <span className="summary-val highlight">KES {advanceAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label htmlFor="mpesa-phone">Disbursement M-Pesa Phone Number</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">+254</span>
                  <input
                    id="mpesa-phone"
                    type="tel"
                    className="form-input"
                    placeholder="0712345678"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <span className="field-hint">Funds will be disbursed instantly via Safaricom Daraja B2C.</span>
              </div>

              <div className="terms-pill">
                <ShieldCheck size={16} />
                <span>2.0% monthly interest rate. Principal and accrued interest deducted upon final sale settlement.</span>
              </div>

              {error && <div className="alert-box error">{error}</div>}

              <div className="modal-actions-right" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={handleResetAndClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Processing M-Pesa Transfer...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Disburse KES {advanceAmount.toLocaleString()}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {result && (
          <div className="modal-footer">
            <button type="button" className="btn-primary" onClick={handleResetAndClose} style={{ width: '100%' }}>
              Done & Return to Receipts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
