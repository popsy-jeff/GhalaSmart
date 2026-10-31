import React, { useState, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { Loan, Deposit } from '../types';
import { fetchLoans, fetchDeposits } from '../api';
import { SettlementModal } from '../components/modals/SettlementModal';
import { WarehouseReceiptModal } from '../components/modals/WarehouseReceiptModal';
import { useAuth } from '../context/AuthContext';

export const FinancingPage: React.FC = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [settlementDeposit, setSettlementDeposit] = useState<Deposit | null>(null);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [receiptDeposit, setReceiptDeposit] = useState<Deposit | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loanList, depList] = await Promise.all([fetchLoans(), fetchDeposits()]);
      setLoans(loanList);
      setDeposits(depList);
    } catch (err: any) {
      setError(err.message || 'Failed to load loan ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalPrincipal = loans.reduce((acc, l) => acc + Number(l.principal_amount), 0);
  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const activePrincipal = activeLoans.reduce((acc, l) => acc + Number(l.principal_amount), 0);
  const totalInterest = loans.reduce((acc, l) => acc + Number(l.accrued_interest), 0);
  const settledLoansCount = loans.filter(l => l.status === 'SETTLED').length;

  const handleOpenSettle = (depositId: number) => {
    const found = deposits.find(d => d.id === depositId);
    if (found) {
      setSettlementDeposit(found);
      setIsSettlementOpen(true);
    }
  };

  const handleOpenReceipt = (depositId: number) => {
    const found = deposits.find(d => d.id === depositId);
    if (found) {
      setReceiptDeposit(found);
      setIsReceiptOpen(true);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Grain Collateral Financing</h1>
          <p className="page-subtitle">
            Manage your risk-adjusted cash advances, accrued financing interest, and final sale settlements
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card highlight-kpi">
          <div className="kpi-icon-wrap primary">
            <Wallet size={24} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Active Cash Advances</span>
            <span className="kpi-value">
              KES {activePrincipal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
            <span className="kpi-sub positive">{activeLoans.length} active credit facility</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap info">
            <DollarSign size={24} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Cumulative Disbursed</span>
            <span className="kpi-value">
              KES {totalPrincipal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
            <span className="kpi-sub">Via Safaricom Daraja B2C</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap warning">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Accrued Interest</span>
            <span className="kpi-value">
              KES {totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="kpi-sub">Fixed 2.0% monthly</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap success">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Settled & Cleared</span>
            <span className="kpi-value">{settledLoansCount}</span>
            <span className="kpi-sub positive">Zero outstanding liability</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-box error" style={{ margin: '1.5rem 0' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loans Ledger Table */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h3>Collateral Credit Ledger</h3>
            <p className="table-sub">Instant liquidity issued against verified grain inventory</p>
          </div>
          <button type="button" className="btn-sm btn-outline" onClick={loadData}>
            Refresh Ledger
          </button>
        </div>

        {isLoading ? (
          <div className="table-loading-state">
            <Loader2 size={32} className="spin-icon" />
            <p>Loading member financing facilities...</p>
          </div>
        ) : loans.length === 0 ? (
          <div className="table-empty-state">
            <Wallet size={40} className="empty-icon" />
            <h4>No Active Advances</h4>
            <p>
              When you deposit maize and accept a cash advance, your credit facility and repayment
              ledger will appear here.
            </p>
          </div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Credit ID</th>
                  <th>Warehouse Receipt</th>
                  <th>Disbursed Principal</th>
                  <th>Financing Rate</th>
                  <th>Disbursement Date</th>
                  <th>Accrued Interest</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const associatedDeposit = deposits.find(d => d.id === loan.deposit_id);
                  const isSettled = loan.status === 'SETTLED';

                  return (
                    <tr key={loan.id}>
                      <td>
                        <strong>#CR-{loan.id.toString().padStart(4, '0')}</strong>
                      </td>
                      <td>
                        {associatedDeposit ? (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => handleOpenReceipt(loan.deposit_id)}
                          >
                            <FileText size={14} />
                            <span>{associatedDeposit.receipt_number}</span>
                          </button>
                        ) : (
                          <span>Receipt #{loan.deposit_id}</span>
                        )}
                      </td>
                      <td>
                        <strong className="positive">
                          KES {Number(loan.principal_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>{(Number(loan.interest_rate) * 100 * 4).toFixed(1)}% / mo</td>
                      <td>{loan.disbursement_date}</td>
                      <td>
                        {isSettled ? (
                          <span>KES {Number(loan.accrued_interest).toFixed(2)} (Settled)</span>
                        ) : (
                          <span className="text-warning">
                            <Clock size={12} /> Accruing
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${isSettled ? 'status-sold' : 'status-stored'}`}>
                          {isSettled ? 'SETTLED' : 'ACTIVE ADVANCE'}
                        </span>
                      </td>
                      <td>
                        {!isSettled && associatedDeposit && associatedDeposit.status === 'STORED' ? (
                          <button
                            type="button"
                            className="btn-action-settle"
                            onClick={() => handleOpenSettle(loan.deposit_id)}
                          >
                            <span>Settle & Sell</span>
                            <ArrowUpRight size={14} />
                          </button>
                        ) : (
                          <span className="text-muted text-sm">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      <SettlementModal
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        deposit={settlementDeposit}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Warehouse Receipt Modal */}
      <WarehouseReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        deposit={receiptDeposit}
        farmer={user}
      />
    </div>
  );
};
