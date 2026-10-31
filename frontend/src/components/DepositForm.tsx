import React, { useState, useEffect } from 'react';
import type { RecommendRequest } from '../types';
import { fetchCounties } from '../api';
import { MapPin, Scale, Award, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (data: RecommendRequest) => void;
  isLoading: boolean;
}

const DEFAULT_COUNTIES = [
  'Uasin-Gishu',
  'Trans-Nzoia',
  'Nakuru',
  'Bungoma',
  'Kakamega',
];

const GRADES: Array<{ value: 'Grade 1' | 'Grade 2' | 'Grade 3'; label: string; desc: string }> = [
  { value: 'Grade 1', label: 'Grade 1 (Premium)', desc: 'Moisture ≤ 13.5%, clean kernels, highest price' },
  { value: 'Grade 2', label: 'Grade 2 (Standard)', desc: 'Standard commercial milling quality' },
  { value: 'Grade 3', label: 'Grade 3 (Discounted)', desc: 'Slightly higher moisture / feed quality' },
];

export const DepositForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [counties, setCounties] = useState<string[]>(DEFAULT_COUNTIES);
  const [county, setCounty] = useState<string>(DEFAULT_COUNTIES[0]);
  const [quantityKg, setQuantityKg] = useState<number>(1000);
  const [grade, setGrade] = useState<'Grade 1' | 'Grade 2' | 'Grade 3'>('Grade 1');

  useEffect(() => {
    let isMounted = true;
    fetchCounties()
      .then((loaded) => {
        if (isMounted && loaded.length > 0) {
          setCounties(loaded);
          if (!loaded.includes(county)) {
            setCounty(loaded[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load county list:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantityKg <= 0) return;
    onSubmit({
      county,
      quantity_kg: Number(quantityKg),
      grade,
    });
  };

  // Quick preset buttons for common farmer batch sizes
  const handlePreset = (kg: number) => {
    setQuantityKg(kg);
  };

  const estimatedBags = (quantityKg / 90).toFixed(1);

  return (
    <div className="card form-container">
      <div className="form-header">
        <div className="form-header-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <h2>Maize Deposit Assessment</h2>
          <p className="form-subtitle">Enter your grain batch specs for AI storage & price prediction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* County Select */}
        <div className="form-group">
          <label htmlFor="county-select">
            <MapPin size={16} className="label-icon" />
            County / Warehouse Hub
          </label>
          <div className="input-with-icon">
            <select
              id="county-select"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              disabled={isLoading}
            >
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c} County
                </option>
              ))}
            </select>
          </div>
          <span className="field-hint">Wholesale spot & future prices are calibrated per county</span>
        </div>

        {/* Quantity (Kg) */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="quantity-input">
              <Scale size={16} className="label-icon" />
              Deposit Quantity (Kg)
            </label>
            <span className="unit-badge">≈ {estimatedBags} bags (90kg ea)</span>
          </div>

          <input
            id="quantity-input"
            type="number"
            min="10"
            step="10"
            value={quantityKg}
            onChange={(e) => setQuantityKg(Math.max(0, Number(e.target.value)))}
            placeholder="e.g. 1000"
            required
            disabled={isLoading}
          />

          <div className="preset-chips">
            <button
              type="button"
              className={`chip ${quantityKg === 450 ? 'chip-active' : ''}`}
              onClick={() => handlePreset(450)}
            >
              5 Bags (450kg)
            </button>
            <button
              type="button"
              className={`chip ${quantityKg === 900 ? 'chip-active' : ''}`}
              onClick={() => handlePreset(900)}
            >
              10 Bags (900kg)
            </button>
            <button
              type="button"
              className={`chip ${quantityKg === 1800 ? 'chip-active' : ''}`}
              onClick={() => handlePreset(1800)}
            >
              20 Bags (1,800kg)
            </button>
            <button
              type="button"
              className={`chip ${quantityKg === 4500 ? 'chip-active' : ''}`}
              onClick={() => handlePreset(4500)}
            >
              50 Bags (4,500kg)
            </button>
          </div>
        </div>

        {/* Maize Grade */}
        <div className="form-group">
          <label htmlFor="grade-select">
            <Award size={16} className="label-icon" />
            Maize Quality Grade
          </label>
          <div className="grade-selector">
            {GRADES.map((g) => (
              <label
                key={g.value}
                className={`grade-radio-card ${grade === g.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="maize-grade"
                  value={g.value}
                  checked={grade === g.value}
                  onChange={() => setGrade(g.value)}
                  disabled={isLoading}
                />
                <div className="grade-info">
                  <div className="grade-title">{g.label}</div>
                  <div className="grade-desc">{g.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || quantityKg <= 0}
          className="btn-primary btn-submit"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spinner-icon" />
              <span>Analyzing Market Trends...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Get AI Recommendation</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
