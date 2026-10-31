import React, { useState } from 'react';
import { DepositForm } from '../components/DepositForm';
import { RecommendationDashboard } from '../components/RecommendationDashboard';
import { getRecommendation } from '../api';
import type { RecommendRequest, RecommendResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, BarChart2, Shield, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<RecommendResponse | null>(null);
  const [lastInput, setLastInput] = useState<RecommendRequest>({
    county: user?.county || 'Uasin-Gishu',
    quantity_kg: 1800,
    grade: 'Grade 1',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (formData: RecommendRequest) => {
    setIsLoading(true);
    setError(null);
    setLastInput(formData);

    try {
      const response = await getRecommendation(formData);
      setRecommendation(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to generate recommendation';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Personalized Welcome Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-text">
          <div className="welcome-tag">
            <UserCheck size={14} />
            <span>Welcome, {user?.full_name || 'Grain Member'}</span>
          </div>
          <h1>Granary Storage & Financing Advisor</h1>
          <p className="page-subtitle">
            Use KAMIS & agriBORA wholesale market prices to decide whether to
            store or sell your maize, and receive instant M-Pesa cash advances.
          </p>
        </div>
      </div>

      <div className="content-grid">
        {/* Left Panel: Assessment Input Form */}
        <div className="left-panel">
          <DepositForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        </div>

        {/* Right Panel: Recommendation & Financing */}
        <div className="right-panel">
          {error && (
            <div className="card error-banner">
              <div className="error-icon-box">
                <AlertTriangle size={24} />
              </div>
              <div className="error-content">
                <h3>Assessment Failed</h3>
                <p>{error}</p>
                <button
                  type="button"
                  className="btn-retry"
                  onClick={() => handleFormSubmit(lastInput)}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {isLoading && !error && (
            <div className="card loading-card">
              <div className="pulsing-radar"></div>
              <h3>Analyzing Market Forecast...</h3>
              <p>
                Evaluating historical wholesale price movements, seasonal patterns, and granary
                carrying costs for {lastInput.county}.
              </p>
            </div>
          )}

          {!isLoading && recommendation && (
            <RecommendationDashboard
              recommendation={recommendation}
              depositInput={lastInput}
            />
          )}

          {!isLoading && !recommendation && !error && (
            <div className="card empty-state">
              <div className="empty-icon-circle">
                <BarChart2 size={36} />
              </div>
              <h3>Ready for Decision Analysis</h3>
              <p>
                Configure your maize quantity, quality grade, and county in the form to get a personalized
                hold-vs-sell forecast with immediate cash advance options.
              </p>

              <div className="empty-features-grid">
                <div className="feature-pill">
                  <TrendingUp size={16} />
                  <span>Market Price Outlook</span>
                </div>
                <div className="feature-pill">
                  <Shield size={16} />
                  <span>Certified Granary Storage</span>
                </div>
                <div className="feature-pill">
                  <ArrowRight size={16} />
                  <span>Instant 60% M-Pesa Advance</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
