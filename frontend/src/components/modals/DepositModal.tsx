import React, { useState, useEffect } from 'react';
import { X, Warehouse, Loader2, ArrowRight } from 'lucide-react';
import type { Deposit, RecommendResponse } from '../../types';
import { fetchCounties, getRecommendation, createDeposit } from '../../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDepositCreated: (deposit: Deposit) => void;
  defaultCounty?: string;
}

const PRESET_QUANTITIES = [
  { label: '5 Bags (450 kg)', kg: 450 },
  { label: '10 Bags (900 kg)', kg: 900 },
  { label: '20 Bags (1,800 kg)', kg: 1800 },
  { label: '50 Bags (4,500 kg)', kg: 4500 },
];

export const DepositModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onDepositCreated,
  defaultCounty = 'Uasin-Gishu',
}) => {
  const [counties, setCounties] = useState<string[]>([]);
  const [county, setCounty] = useState(defaultCounty);
  const [quantityKg, setQuantityKg] = useState(1800);
  const [grade, setGrade] = useState<'Grade 1' | 'Grade 2' | 'Grade 3'>('Grade 1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<RecommendResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCounties().then(list => {
        setCounties(list);
        if (!list.includes(county) && list.length > 0) {
          setCounty(list[0]);
        }
      });
    }
  }, [isOpen]);

  // Fetch quick live advisory preview when parameters change
  useEffect(() => {
    if (!isOpen || quantityKg <= 0 || !county) return;

    let isMounted = true;
    setLoadingForecast(true);
    getRecommendation({ county, quantity_kg: quantityKg, grade })
      .then(res => {
        if (isMounted) setForecast(res);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingForecast(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, county, quantityKg, grade]);

  if (!isOpen) return null;

  const bags = (quantityKg / 90.0).toFixed(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const deposit = await createDeposit({
        county,
        quantity_kg: quantityKg,
        grade,
      });
      onDepositCreated(deposit);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit grain deposit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-badge primary">
              <Warehouse size={22} />
            </div>
            <div>
              <h3>New Grain Custody Deposit</h3>
              <p className="modal-subtitle">Generate an official Warehouse Receipt & Collateral Valuation</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* County Selection */}
            <div className="form-group">
              <label htmlFor="modal-county">Granary Intake County</label>
              <select
                id="modal-county"
                className="form-select"
                value={county}
                onChange={e => setCounty(e.target.value)}
              >
                {counties.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label htmlFor="modal-qty">Grain Weight in Kilograms</label>
              <div className="input-with-tag">
                <input
                  id="modal-qty"
                  type="number"
                  min="90"
                  step="10"
                  className="form-input"
                  value={quantityKg}
                  onChange={e => setQuantityKg(parseFloat(e.target.value) || 0)}
                  required
                />
                <span className="input-tag">~{bags} Bags (90kg standard)</span>
              </div>

              {/* Preset Chips */}
              <div className="preset-chips-row">
                {PRESET_QUANTITIES.map(preset => (
                  <button
                    key={preset.kg}
                    type="button"
                    className={`preset-chip ${quantityKg === preset.kg ? 'active' : ''}`}
                    onClick={() => setQuantityKg(preset.kg)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Maize Quality Grade */}
            <div className="form-group">
              <label>Maize Grade Inspection</label>
              <div className="grade-selector-grid">
                {(['Grade 1', 'Grade 2', 'Grade 3'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`grade-select-card ${grade === g ? 'active' : ''}`}
                    onClick={() => setGrade(g)}
                  >
                    <strong>{g}</strong>
                    <span>
                      {g === 'Grade 1'
                        ? '100% Spot Valuation &bull; Low Moisture'
                        : g === 'Grade 2'
                        ? '95% Spot Valuation &bull; Standard'
                        : '85% Spot Valuation &bull; Minor Defects'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Advisory Preview */}
            {forecast && (
              <div className="modal-forecast-preview">
                <div className="preview-top">
                  <span className="preview-tag">AI Forecast Advisory</span>
                  <span className={`advisory-badge ${forecast.decision === 'Store' ? 'store' : 'sell'}`}>
                    {forecast.decision === 'Store' ? 'RECOMMENDED: STORE' : 'RECOMMENDED: SELL NOW'}
                  </span>
                </div>
                <div className="preview-stats">
                  <div>
                    <span className="label">Spot Price:</span>
                    <strong>KES {forecast.current_price_per_kg.toFixed(2)}/kg</strong>
                  </div>
                  <div>
                    <span className="label">Forecast Peak:</span>
                    <strong>KES {forecast.forecasted_price_per_kg.toFixed(2)}/kg</strong>
                  </div>
                  <div>
                    <span className="label">60% Cash Advance:</span>
                    <strong className="positive">KES {forecast.advance_offer.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="alert-box error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Issuing Warehouse Receipt...</span>
                </>
              ) : (
                <>
                  <span>Issue Warehouse Receipt</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
