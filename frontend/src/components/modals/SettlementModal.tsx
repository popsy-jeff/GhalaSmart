import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Loader2, ArrowRight } from 'lucide-react';
import type { Deposit, SettleResponse } from '../../types';
import { settleDeposit } from '../../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deposit: Deposit | null;
  onSuccess: (res: SettleResponse) => void;
}

export const SettlementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deposit,
  onSuccess,
}) => {
  const [salePrice, setSalePrice] = useState<number>(() => deposit?.current_price_per_kg || 48.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SettleResponse | null>(null);

  if (!isOpen || !deposit) return null;

  const currentPrice = deposit.current_price_per_kg || 45.0;
  const activeSalePrice = salePrice > 0 ? salePrice : currentPrice;
  const grossEstimate = deposit.quantity_kg * activeSalePrice;
  const estimatedStorage = (deposit.quantity_kg / 90.0) * 50.0; // ~50 KES per bag
  const estimatedAdvancePrincipal = grossEstimate * 0.60;
  const estimatedNet = Math.max(0, grossEstimate - estimatedAdvancePrincipal - estimatedStorage);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await settleDeposit(deposit.id, {
        sale_price_per_kg: activeSalePrice,
      });
      setResult(response);
      onSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Settlement failed. Please verify loan status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-badge success">
              <DollarSign size={22} />
            </div>
            <div>
              <h3>Grain Sale & Loan Settlement</h3>
              <p className="modal-subtitle">Receipt #{deposit.receipt_number} &bull; M-Pesa Net Payout</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {result ? (
            /* Settlement Voucher */
            <div className="mpesa-voucher-card">
              <div className="voucher-top-badge">
                <CheckCircle2 size={32} className="voucher-icon" />
                <h4>Settlement Completed!</h4>
                <p>Maize successfully sold and net profit transferred</p>
              </div>

              <div className="voucher-receipt-box">
                <div className="voucher-row highlight">
                  <span>M-Pesa Transaction Ref</span>
                  <strong className="code-text">{result.mpesa_receipt}</strong>
                </div>
                <div className="voucher-row">
                  <span>Gross Grain Sale Value</span>
                  <span>KES {result.gross_sale_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="voucher-row text-danger">
                  <span>Principal Advance Deducted</span>
                  <span>- KES {result.principal_deducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="voucher-row text-danger">
                  <span>Accrued Financing Interest</span>
                  <span>- KES {result.interest_deducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="voucher-row text-danger">
                  <span>Granary Storage Fees</span>
                  <span>- KES {result.storage_fees_deducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="voucher-row total-row">
                  <span>Net Farmer Cash Payout</span>
                  <strong className="amount-text positive">
                    KES {result.net_payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="voucher-note">
                <p>A full settlement breakdown has been dispatched via SMS to your phone.</p>
              </div>
            </div>
          ) : (
            /* Settlement Calculator & Confirmation */
            <form onSubmit={handleSettle}>
              <div className="settlement-preview-box">
                <div className="form-group">
                  <label htmlFor="sale-price-input">
                    Sale Unit Price (KES / kg)
                  </label>
                  <div className="input-with-action">
                    <input
                      id="sale-price-input"
                      type="number"
                      step="0.5"
                      min="10"
                      className="form-input"
                      value={salePrice}
                      onChange={e => setSalePrice(parseFloat(e.target.value) || 0)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-sm btn-outline"
                      onClick={() => setSalePrice(deposit.current_price_per_kg || 45.0)}
                    >
                      Use Market Spot ({deposit.current_price_per_kg || 45.0} KES)
                    </button>
                  </div>
                  <span className="field-hint">
                    Deposit quantity: <strong>{deposit.quantity_kg.toLocaleString()} kg</strong> ({deposit.grade} maize)
                  </span>
                </div>

                <div className="calculation-breakdown-card">
                  <div className="calc-line">
                    <span>Gross Proceeds ({deposit.quantity_kg} kg @ KES {activeSalePrice}/kg):</span>
                    <strong>KES {grossEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="calc-line text-muted">
                    <span>Est. Loan Principal & Interest:</span>
                    <span>- KES {estimatedAdvancePrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="calc-line text-muted">
                    <span>Est. Granary Storage (50 KES/bag):</span>
                    <span>- KES {estimatedStorage.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="calc-line total-line">
                    <span>Estimated Net Cash Payout:</span>
                    <strong className="positive">~ KES {estimatedNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              </div>

              {error && <div className="alert-box error">{error}</div>}

              <div className="modal-actions-right" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Transacting Sale & M-Pesa Payout...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Sale & Disburse Net Profit</span>
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
            <button type="button" className="btn-primary" onClick={handleClose} style={{ width: '100%' }}>
              Close & View Updated Receipts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
