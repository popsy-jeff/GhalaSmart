import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDeposit, settleDeposit, fetchLoan, fetchLoanTransactions } from '../api';
import type { Deposit, SettleResponse, Loan, Transaction } from '../types';
import {
  ArrowLeft,
  Warehouse,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Receipt,
  Scale,
  Calendar,
  Loader2,
  HelpCircle,
} from 'lucide-react';

export const SettlementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const depositId = Number(id);

  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salePriceInput, setSalePriceInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSettling, setIsSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<SettleResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!depositId || isNaN(depositId)) {
      setErrorMessage('Invalid deposit identifier');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const dep = await fetchDeposit(depositId);
        setDeposit(dep);

        // Pre-populate recommended sale price if available
        if (dep.forecasted_price_per_kg) {
          setSalePriceInput(dep.forecasted_price_per_kg.toString());
        } else if (dep.current_price_per_kg) {
          setSalePriceInput(dep.current_price_per_kg.toString());
        }

        // Attempt to fetch loan by deposit id (or loan id)
        try {
          const l = await fetchLoan(depositId);
          setLoan(l);
          if (l && l.id) {
            const txns = await fetchLoanTransactions(l.id);
            setTransactions(txns);
          }
        } catch {
          // Loan might not be identical ID or may not exist yet
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch deposit details';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [depositId]);

  const handleSettle = async () => {
    if (!deposit) return;
    setIsSettling(true);
    setErrorMessage(null);

    const overridePrice = salePriceInput ? Number(salePriceInput) : undefined;

    try {
      const response = await settleDeposit(deposit.id, {
        sale_price_per_kg: overridePrice && !isNaN(overridePrice) ? overridePrice : undefined,
      });
      setSettleResult(response);
      setDeposit((prev) => (prev ? { ...prev, status: 'SOLD' } : null));

      // Refresh loan/transactions if possible
      try {
        const l = await fetchLoan(response.loan_id);
        setLoan(l);
        const txns = await fetchLoanTransactions(l.id);
        setTransactions(txns);
      } catch {
        // Non-critical
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Settlement failed. Please check loan status.';
      setErrorMessage(msg);
    } finally {
      setIsSettling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settlement-loading card">
        <div className="pulsing-radar"></div>
        <h3>Loading Deposit Details...</h3>
        <p>Fetching warehouse receipt and financing records for #{id}</p>
      </div>
    );
  }

  if (errorMessage && !deposit) {
    return (
      <div className="card error-banner">
        <div className="error-icon-box">
          <AlertTriangle size={24} />
        </div>
        <div className="error-content">
          <h3>Error Loading Deposit</h3>
          <p>{errorMessage}</p>
          <Link to="/deposits" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            <ArrowLeft size={16} />
            <span>Back to Deposits List</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!deposit) {
    return null;
  }

  const isSold = deposit.status.toUpperCase() === 'SOLD';
  const qty = Number(deposit.quantity_kg);
  const bags = Math.round(qty / 90);

  // Live estimated gross sale
  const currentPriceEstimate = salePriceInput
    ? Number(salePriceInput)
    : deposit.current_price_per_kg || 45;
  const estimatedGross = currentPriceEstimate * qty;

  return (
    <div className="settlement-page">
      <div className="page-header">
        <div className="header-back-link">
          <Link to="/deposits" className="back-link">
            <ArrowLeft size={16} />
            <span>Back to Deposits</span>
          </Link>
          <h1>Settlement & Grain Sale</h1>
          <p className="page-subtitle">
            Liquidate stored maize at current market price, reconcile warehouse storage fees and cash advance financing, and disburse net profit via M-Pesa.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="error-alert" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SUCCESS SETTLEMENT RECEIPT (IF SETTLED) */}
      {settleResult && (
        <div className="receipt-success-card">
          <div className="receipt-header">
            <div className="receipt-check-icon">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3>Grain Sold & Account Settled!</h3>
              <p>M-Pesa payment generated for the net settlement proceeds.</p>
            </div>
          </div>

          <div className="mpesa-voucher">
            <div className="mpesa-top">
              <span className="mpesa-brand">M-PESA FINAL SETTLEMENT PAYOUT</span>
              <span className="mpesa-stamp">SETTLED</span>
            </div>

            <div className="mpesa-code-row">
              <div className="mpesa-code-label">M-Pesa Transaction Receipt</div>
              <div className="mpesa-code-val">{settleResult.mpesa_receipt}</div>
            </div>

            <div className="settlement-deductions-breakdown">
              <div className="deduction-row gross-row">
                <span>Gross Grain Sale Value</span>
                <strong>
                  KES {settleResult.gross_sale_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="deduction-row negative-row">
                <span>Principal Advance Deducted</span>
                <span>
                  - KES {settleResult.principal_deducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="deduction-row negative-row">
                <span>Accrued Financing Interest</span>
                <span>
                  - KES {settleResult.interest_deducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="deduction-row negative-row">
                <span>Storage Handling & Warehouse Fees</span>
                <span>
                  - KES {settleResult.storage_fees_deducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="deduction-row net-payout-row">
                <span>Final Net Farmer Payout (M-Pesa)</span>
                <span className="net-payout-val">
                  KES {settleResult.net_payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mpesa-message">{settleResult.message}</div>
          </div>

          <div className="receipt-actions">
            <Link to="/deposits" className="btn-primary">
              <Warehouse size={18} />
              <span>Return to Deposits List</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Grid: Deposit Overview + Settlement Action */}
      <div className="content-grid">
        {/* Left Card: Deposit Summary */}
        <div className="left-panel">
          <div className="card deposit-details-card">
            <div className="card-header-row">
              <div className="card-badge-num">Receipt #DEP-{deposit.id.toString().padStart(4, '0')}</div>
              <span className={`status-pill ${isSold ? 'status-sold' : 'status-stored'}`}>
                {isSold ? 'SETTLED' : 'STORED'}
              </span>
            </div>

            <h3>Warehouse Receipt Specs</h3>

            <div className="spec-grid">
              <div className="spec-item">
                <span className="spec-label">County Hub</span>
                <span className="spec-val">{deposit.county}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Maize Grade</span>
                <span className="spec-val">{deposit.grade}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">
                  <Scale size={14} className="inline-icon" />
                  Quantity
                </span>
                <span className="spec-val">
                  {qty.toLocaleString()} kg ({bags} bags)
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">
                  <Calendar size={14} className="inline-icon" />
                  Deposit Date
                </span>
                <span className="spec-val">
                  {deposit.deposit_date || new Date(deposit.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Spot Price at Deposit</span>
                <span className="spec-val">
                  {deposit.current_price_per_kg ? `KES ${deposit.current_price_per_kg}/kg` : '—'}
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Forecast Peak Price</span>
                <span className="spec-val highlight-green">
                  {deposit.forecasted_price_per_kg ? `KES ${deposit.forecasted_price_per_kg}/kg` : '—'}
                </span>
              </div>
            </div>

            {/* Loan info if available */}
            {loan && (
              <div className="loan-sub-box">
                <h4>Active Cash Advance Facility</h4>
                <div className="spec-grid">
                  <div className="spec-item">
                    <span className="spec-label">Principal Disbursed</span>
                    <span className="spec-val">
                      KES {Number(loan.principal_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Weekly Interest Rate</span>
                    <span className="spec-val">{(Number(loan.interest_rate) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Disbursement Date</span>
                    <span className="spec-val">{loan.disbursement_date}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Loan Status</span>
                    <span className="spec-val">{loan.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Ledger if any */}
            {transactions.length > 0 && (
              <div className="ledger-section">
                <h4>Transaction History</h4>
                <div className="transactions-list">
                  {transactions.map((t) => (
                    <div key={t.id} className="txn-row">
                      <div>
                        <strong>{t.type.replace('_', ' ')}</strong>
                        <div className="txn-receipt">Receipt: {t.mpesa_receipt || 'Internal'}</div>
                      </div>
                      <div className="txn-amount">
                        KES {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Sell & Settle Form */}
        <div className="right-panel">
          <div className="card settlement-action-card">
            <h3>Settlement & Liquidation</h3>
            <p className="card-subtext">
              Execute grain sale at current market or contract price. All financing costs and warehouse fees are automatically deducted.
            </p>

            {isSold ? (
              <div className="already-settled-box">
                <CheckCircle2 size={32} className="check-icon" />
                <h4>This Deposit Has Been Fully Settled</h4>
                <p>
                  All grain associated with Receipt #DEP-{deposit.id.toString().padStart(4, '0')} has been sold and net proceeds disbursed to the farmer.
                </p>
                <Link to="/deposits" className="btn-secondary" style={{ marginTop: '1rem', width: 'auto' }}>
                  View All Deposits
                </Link>
              </div>
            ) : (
              <div className="settle-form-area">
                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="sale-price">Sale Price per Kg (KES)</label>
                    <span className="field-hint-inline">
                      <HelpCircle size={14} className="inline-icon" />
                      Leave blank to use live market spot price
                    </span>
                  </div>
                  <div className="input-with-prefix">
                    <span className="input-prefix">KES</span>
                    <input
                      id="sale-price"
                      type="number"
                      step="0.5"
                      min="10"
                      value={salePriceInput}
                      onChange={(e: any) => setSalePriceInput(e.target.value)}
                      placeholder={deposit.current_price_per_kg?.toString() || '45.0'}
                      disabled={isSettling}
                    />
                  </div>
                </div>

                {/* Estimate Preview */}
                <div className="settlement-preview-box">
                  <div className="preview-row">
                    <span>Est. Gross Grain Value</span>
                    <span>KES {estimatedGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="preview-row">
                    <span>Estimated Advance Principal</span>
                    <span className="negative-val">
                      {loan
                        ? `- KES ${Number(loan.principal_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : '~ 60% advance'}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span>Estimated Storage & Interest</span>
                    <span className="negative-val">Deducted automatically</span>
                  </div>
                </div>

                <div className="settlement-notice">
                  <DollarSign size={18} className="notice-icon" />
                  <span>
                    Upon execution, the full net proceeds will be simulated as an instant M-Pesa transfer to the farmer's registered number.
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-primary btn-large btn-settle-execute"
                  onClick={handleSettle}
                  disabled={isSettling}
                >
                  {isSettling ? (
                    <>
                      <Loader2 size={20} className="spinner-icon" />
                      <span>Liquidating Grain & Settling Payout...</span>
                    </>
                  ) : (
                    <>
                      <Receipt size={20} />
                      <span>Sell & Settle</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
