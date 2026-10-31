import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { RecommendResponse, Deposit, AcceptAdvanceResponse } from '../types';
import { createDeposit } from '../api';
import { displayHorizon } from '../forecast';
import { useAuth } from '../context/AuthContext';
import { AdvanceModal } from './modals/AdvanceModal';
import { WarehouseReceiptModal } from './modals/WarehouseReceiptModal';
import {
  TrendingUp,
  TrendingDown,
  Warehouse,
  Coins,
  ShieldCheck,
  Loader2,
  FileText,
  Smartphone,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface Props {
  recommendation: RecommendResponse;
  depositInput: {
    county: string;
    quantity_kg: number;
    grade: 'Grade 1' | 'Grade 2' | 'Grade 3';
  };
}

export const RecommendationDashboard: React.FC<Props> = ({
  recommendation,
  depositInput,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);
  const [createdDeposit, setCreatedDeposit] = useState<Deposit | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const isStore = recommendation.decision === 'Store';

  // Price/cost cards: the recommended hold, or for "Sell Now" what holding to the peak would cost
  const horizon = displayHorizon(recommendation);
  const shownPrice = horizon?.forecasted_price_per_kg ?? recommendation.forecasted_price_per_kg;
  const shownWeeks = horizon?.weeks ?? recommendation.recommended_weeks;
  const shownStorage = horizon?.storage_cost ?? recommendation.storage_cost;
  const shownInterest = horizon?.interest ?? recommendation.advance_interest;
  const holdNote = isStore ? '' : `If held ${shownWeeks} weeks · `;

  // Handle immediate deposit storage
  const handleCreateDepositOnly = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    setIsCreatingDeposit(true);
    setError(null);
    try {
      const deposit = await createDeposit({
        county: depositInput.county,
        quantity_kg: depositInput.quantity_kg,
        grade: depositInput.grade,
      });
      setCreatedDeposit(deposit);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to issue warehouse receipt.');
    } finally {
      setIsCreatingDeposit(false);
    }
  };

  // Handle save deposit then open advance modal
  const handleSaveAndOpenAdvance = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    setIsCreatingDeposit(true);
    setError(null);
    try {
      const deposit = await createDeposit({
        county: depositInput.county,
        quantity_kg: depositInput.quantity_kg,
        grade: depositInput.grade,
      });
      setCreatedDeposit(deposit);
      setIsAdvanceModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to issue warehouse receipt.');
    } finally {
      setIsCreatingDeposit(false);
    }
  };

  return (
    <div className={`card dashboard-container ${isStore ? 'highlight-store' : 'highlight-sell'}`}>
      {/* Header Decision Banner */}
      <div className="recommendation-header">
        <div className="decision-title-group">
          <div className={`decision-badge ${isStore ? 'badge-store' : 'badge-sell'}`}>
            {isStore ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span>{recommendation.decision.toUpperCase()}</span>
          </div>
          <div>
            <h2 className="recommendation-heading">
              {isStore ? 'Recommended Strategy: Store & Hold' : 'Recommended Strategy: Sell Now'}
            </h2>
            <p className="recommendation-sub">
              {isStore
                ? `Optimal holding period: ${recommendation.recommended_weeks} weeks for maximum net market gain.`
                : 'Current spot price is optimal; wholesale prices are not forecasted to outpace storage costs.'}
            </p>
          </div>
        </div>
      </div>

      {/* Reasoning Box */}
      <div className="reasoning-box">
        <div className="reasoning-header">
          <ShieldCheck size={18} />
          <strong>Market Advisory</strong>
        </div>
        <p>{recommendation.reasoning}</p>
      </div>

      {/* Primary Key Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Current Spot Price</h4>
          <p className="stat-value">KES {recommendation.current_price_per_kg.toFixed(2)}</p>
          <span className="stat-sub">per kg in {depositInput.county}</span>
        </div>

        <div className="stat-card">
          <h4>{isStore ? 'Forecasted Sale Price' : 'Forecasted Peak Price'}</h4>
          <p className="stat-value highlight-price">
            KES {shownPrice.toFixed(2)}
          </p>
          <span className="stat-sub">in {shownWeeks} weeks</span>
        </div>

        <div className="stat-card">
          <h4>Est. Storage Fees</h4>
          <p className="stat-value negative">
            - KES {shownStorage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="stat-sub">{holdNote}KES 45/bag weekly storage</span>
        </div>

        <div className="stat-card">
          <h4>Advance Loan Interest</h4>
          <p className="stat-value negative">
            - KES {shownInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="stat-sub">{holdNote}0.5% weekly financing rate</span>
        </div>

        {/* Expected Net Value Hero */}
        <div className="stat-card highlight">
          <div className="hero-stat-label">Projected Net Farmer Value</div>
          <p className="hero-stat-value">
            KES {recommendation.expected_net_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="hero-stat-sub">
            {isStore
              ? 'Gross sale minus carrying costs & financing interest'
              : 'Selling now at the spot price, with no storage or interest'}
          </span>
        </div>
      </div>

      {/* Forecast Horizons Table */}
      {recommendation.forecast_breakdown && recommendation.forecast_breakdown.length > 0 && (
        <div className="breakdown-section">
          <h3>Forecast Horizon Analysis (24 Weeks)</h3>
          <div className="table-responsive">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Hold Duration</th>
                  <th>Forecast (KES/kg)</th>
                  <th>Storage Fee</th>
                  <th>Financing</th>
                  <th>Est. Net Value</th>
                  <th>Net vs Sell Now</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.forecast_breakdown.map(h => {
                  const isOptimal = h.weeks === recommendation.recommended_weeks;
                  const isProfitable = h.profit_vs_sell_now > 0;
                  return (
                    <tr key={h.weeks} className={isOptimal ? 'row-optimal' : ''}>
                      <td>
                        <strong>{h.weeks} Weeks</strong>
                        {isOptimal && <span className="optimal-tag">Optimal</span>}
                      </td>
                      <td>KES {h.forecasted_price_per_kg.toFixed(2)}</td>
                      <td>KES {h.storage_cost.toLocaleString()}</td>
                      <td>KES {h.interest.toLocaleString()}</td>
                      <td>
                        <strong>KES {h.expected_net.toLocaleString()}</strong>
                      </td>
                      <td className={isProfitable ? 'positive-gain' : 'neutral-gain'}>
                        {isProfitable ? '+' : ''}KES {h.profit_vs_sell_now.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-box error" style={{ marginTop: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Action Decision Strip */}
      <div className="advance-action-card">
        <div className="advance-header">
          <Coins size={28} className="advance-icon" />
          <div>
            <h3>Warehouse Receipt & Advance Options</h3>
            <p className="advance-subtitle">
              Issue certified collateral receipt into your member account or unlock instant 60% cash advance
            </p>
          </div>
        </div>

        <div className="advance-amount-box">
          <div className="advance-amount-label">Available Instant Advance (60% Loan-To-Value)</div>
          <div className="advance-amount-value">
            KES {recommendation.advance_offer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="advance-terms-pills">
            <span>2.0% Monthly Interest</span>
            <span>&bull;</span>
            <span>Zero Advance Fee</span>
            <span>&bull;</span>
            <span>Disbursed via Safaricom M-Pesa</span>
          </div>
        </div>

        <div className="cta-button-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCreateDepositOnly}
            disabled={isCreatingDeposit}
          >
            <Warehouse size={18} />
            <span>Store & Generate Receipt Only</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveAndOpenAdvance}
            disabled={isCreatingDeposit}
          >
            {isCreatingDeposit ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Issuing Receipt...</span>
              </>
            ) : (
              <>
                <Smartphone size={18} />
                <span>Store & Accept M-Pesa Advance</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advance Modal */}
      <AdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        deposit={createdDeposit}
        defaultPhone={user?.phone_number || ''}
        onSuccess={() => {
          navigate('/deposits');
        }}
      />

      {/* Warehouse Receipt Modal */}
      <WarehouseReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          navigate('/deposits');
        }}
        deposit={createdDeposit}
        farmer={user}
      />
    </div>
  );
};
