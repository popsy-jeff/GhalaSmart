import React, { useState, useEffect } from 'react';
import { fetchDeposits } from '../api';
import type { Deposit, AcceptAdvanceResponse, SettleResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { WarehouseReceiptModal } from '../components/modals/WarehouseReceiptModal';
import { AdvanceModal } from '../components/modals/AdvanceModal';
import { SettlementModal } from '../components/modals/SettlementModal';
import { DepositModal } from '../components/modals/DepositModal';
import {
  Warehouse,
  Search,
  Filter,
  RefreshCw,
  Scale,
  DollarSign,
  CheckCircle,
  Clock,
  PlusCircle,
  AlertCircle,
  FileText,
  Smartphone,
  Eye,
} from 'lucide-react';

export const DepositsPage: React.FC = () => {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'STORED' | 'SOLD'>('ALL');

  // Modals
  const [selectedReceiptDeposit, setSelectedReceiptDeposit] = useState<Deposit | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [selectedAdvanceDeposit, setSelectedAdvanceDeposit] = useState<Deposit | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  const [selectedSettlementDeposit, setSelectedSettlementDeposit] = useState<Deposit | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  const [isNewDepositModalOpen, setIsNewDepositModalOpen] = useState(false);

  const loadDeposits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDeposits();
      setDeposits(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch deposits';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeposits();
  }, []);

  // Filtered deposits
  const filteredDeposits = deposits.filter(d => {
    const matchesSearch =
      d.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.grade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || d.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary metrics
  const totalQuantityKg = deposits.reduce((sum, d) => sum + Number(d.quantity_kg || 0), 0);
  const storedCount = deposits.filter(d => d.status.toUpperCase() === 'STORED').length;
  const soldCount = deposits.filter(d => d.status.toUpperCase() === 'SOLD').length;
  const totalBags = Math.round(totalQuantityKg / 90);

  const handleOpenReceipt = (d: Deposit) => {
    setSelectedReceiptDeposit(d);
    setIsReceiptModalOpen(true);
  };

  const handleOpenAdvance = (d: Deposit) => {
    setSelectedAdvanceDeposit(d);
    setIsAdvanceModalOpen(true);
  };

  const handleOpenSettlement = (d: Deposit) => {
    setSelectedSettlementDeposit(d);
    setIsSettlementModalOpen(true);
  };

  return (
    <div className="deposits-page">
      <div className="page-header">
        <div>
          <h1>Warehouse Receipts & Collateral</h1>
          <p className="page-subtitle">
            Authenticated granary custody receipts, grade inspections, and M-Pesa liquidation controls
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={loadDeposits}
            disabled={isLoading}
            title="Refresh list"
          >
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsNewDepositModalOpen(true)}
          >
            <PlusCircle size={18} />
            <span>New Maize Deposit</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="summary-cards-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-blue">
            <Warehouse size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Active Receipts</span>
            <span className="kpi-value">{deposits.length}</span>
            <span className="kpi-sub">Certified Collateral</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box kpi-green">
            <Scale size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Total Volume</span>
            <span className="kpi-value">{totalQuantityKg.toLocaleString()} kg</span>
            <span className="kpi-sub">≈ {totalBags} bags (90kg)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box kpi-amber">
            <Clock size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Currently Stored</span>
            <span className="kpi-value">{storedCount}</span>
            <span className="kpi-sub">Holding for peak prices</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box kpi-emerald">
            <CheckCircle size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Settled & Paid</span>
            <span className="kpi-value">{soldCount}</span>
            <span className="kpi-sub">Transferred via M-Pesa</span>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="card table-container">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by receipt #, county, or grade..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="status-filters">
            <Filter size={16} className="filter-icon" />
            <button
              type="button"
              className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({deposits.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === 'STORED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('STORED')}
            >
              Stored ({storedCount})
            </button>
            <button
              type="button"
              className={`filter-btn ${statusFilter === 'SOLD' ? 'active' : ''}`}
              onClick={() => setStatusFilter('SOLD')}
            >
              Settled ({soldCount})
            </button>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="table-loading">
            <div className="pulsing-radar"></div>
            <p>Loading member warehouse receipts...</p>
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="table-empty">
            <Warehouse size={48} className="empty-icon" />
            <h3>No Grain Deposits Found</h3>
            <p>
              {deposits.length === 0
                ? 'Your inventory is currently empty. Issue a new warehouse receipt to get started.'
                : 'No receipts match your search filter criteria.'}
            </p>
            {deposits.length === 0 && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsNewDepositModalOpen(true)}
              >
                <PlusCircle size={18} />
                <span>Issue First Warehouse Receipt</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt Number</th>
                  <th>Intake Date</th>
                  <th>County Depot</th>
                  <th>Quantity (Kg)</th>
                  <th>Grade</th>
                  <th>Spot at Deposit</th>
                  <th>Peak Forecast</th>
                  <th>Status</th>
                  <th>Actions & Modals</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.map(deposit => {
                  const isStored = deposit.status.toUpperCase() === 'STORED';
                  const bags = Math.round(Number(deposit.quantity_kg) / 90);

                  return (
                    <tr key={deposit.id}>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => handleOpenReceipt(deposit)}
                        >
                          <FileText size={15} />
                          <strong>{deposit.receipt_number}</strong>
                        </button>
                      </td>
                      <td>{deposit.deposit_date}</td>
                      <td>
                        <span className="county-cell">{deposit.county}</span>
                      </td>
                      <td>
                        <strong>{Number(deposit.quantity_kg).toLocaleString()} kg</strong>
                        <div className="sub-cell">≈ {bags} bags</div>
                      </td>
                      <td>
                        <span className="grade-badge">{deposit.grade}</span>
                      </td>
                      <td>
                        {deposit.current_price_per_kg
                          ? `KES ${Number(deposit.current_price_per_kg).toFixed(2)}`
                          : '—'}
                      </td>
                      <td>
                        {deposit.forecasted_price_per_kg ? (
                          <span className="forecast-highlight">
                            KES {Number(deposit.forecasted_price_per_kg).toFixed(2)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isStored ? 'status-stored' : 'status-sold'
                          }`}
                        >
                          {isStored ? 'STORED' : 'SETTLED'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className="btn-table-action btn-view"
                            onClick={() => handleOpenReceipt(deposit)}
                            title="View Official Certificate"
                          >
                            <Eye size={14} />
                            <span>Receipt</span>
                          </button>

                          {isStored && (
                            <>
                              <button
                                type="button"
                                className="btn-table-action btn-advance"
                                onClick={() => handleOpenAdvance(deposit)}
                                title="Accept M-Pesa Advance"
                              >
                                <Smartphone size={14} />
                                <span>Advance</span>
                              </button>

                              <button
                                type="button"
                                className="btn-table-action btn-settle"
                                onClick={() => handleOpenSettlement(deposit)}
                                title="Settle & Disburse Net Profit"
                              >
                                <DollarSign size={14} />
                                <span>Settle</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse Receipt Certificate Modal */}
      <WarehouseReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        deposit={selectedReceiptDeposit}
        farmer={user}
      />

      {/* Cash Advance Modal */}
      <AdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        deposit={selectedAdvanceDeposit}
        defaultPhone={user?.phone_number || ''}
        onSuccess={() => {
          loadDeposits();
        }}
      />

      {/* Settlement Modal */}
      <SettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        deposit={selectedSettlementDeposit}
        onSuccess={() => {
          loadDeposits();
        }}
      />

      {/* New Deposit Modal */}
      <DepositModal
        isOpen={isNewDepositModalOpen}
        onClose={() => setIsNewDepositModalOpen(false)}
        onDepositCreated={() => {
          loadDeposits();
        }}
        defaultCounty={user?.county || 'Uasin-Gishu'}
      />
    </div>
  );
};
