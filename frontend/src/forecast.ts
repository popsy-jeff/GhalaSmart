import type { ForecastHorizon, RecommendResponse } from './types';

/**
 * The horizon the price cards should describe.
 * "Store": the recommended holding period.
 * "Sell Now": the week with the highest forecast price, so the cards show what holding would cost.
 */
export function displayHorizon(rec: RecommendResponse): ForecastHorizon | null {
  const horizons = rec.forecast_breakdown ?? [];
  if (rec.decision === 'Store') {
    return horizons.find(h => h.weeks === rec.recommended_weeks) ?? null;
  }
  if (horizons.length === 0) return null;
  return horizons.reduce((best, h) => (h.forecasted_price_per_kg > best.forecasted_price_per_kg ? h : best));
}
