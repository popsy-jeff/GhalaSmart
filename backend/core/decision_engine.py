"""
Core decision engine: evaluates whether a farmer should store or sell,
and calculates advance offers, storage costs, and expected net value.
"""
from ml.forecaster import MaizeForecaster


# Constants
STORAGE_COST_PER_KG_PER_WEEK = 0.50  # KES per kg per week
WEEKLY_INTEREST_RATE = 0.005  # 0.5% per week (~2% per month)
ADVANCE_PERCENTAGE = 0.60  # 60% of current market value
GRADE_MULTIPLIER = {
    "Grade 1": 1.00,
    "Grade 2": 0.95,
    "Grade 3": 0.85,
}


class DecisionEngine:
    """Evaluates storage vs. sell decisions using market price forecasts."""

    def __init__(self, forecaster: MaizeForecaster):
        self.forecaster = forecaster

    def evaluate(
        self,
        county: str,
        quantity_kg: float,
        grade: str,
    ) -> dict:
        """
        Evaluate the best decision for a farmer depositing maize.

        Returns a dict with:
        - decision: "Store" or "Sell Now"
        - current_price_per_kg: current wholesale price (grade-adjusted)
        - forecasted_price_per_kg: best forecasted price (grade-adjusted)
        - recommended_weeks: optimal storage duration
        - storage_cost: total estimated storage cost
        - advance_interest: total interest on the advance
        - expected_net_value: projected net value (KES)
        - advance_offer: cash advance amount (KES)
        - reasoning: human-readable explanation
        - forecast_breakdown: list of per-horizon evaluations
        """
        # Get current market price
        raw_current = self.forecaster.get_current_price(county)
        grade_mult = GRADE_MULTIPLIER.get(grade, 1.0)
        current_price = raw_current * grade_mult

        # Baseline: sell now
        sell_now_value = current_price * quantity_kg

        best = {
            "decision": "Sell Now",
            "current_price_per_kg": round(current_price, 4),
            "forecasted_price_per_kg": round(current_price, 4),
            "recommended_weeks": 0,
            "storage_cost": 0.0,
            "advance_interest": 0.0,
            "expected_net_value": round(sell_now_value, 2),
            "advance_offer": 0.0,
            "reasoning": "",
        }

        # Evaluate storage horizons
        forecast_breakdown = []
        forecasts = self.forecaster.forecast_prices_range(county, max_weeks=24)

        for weeks_ahead, raw_forecasted in forecasts:
            forecasted = raw_forecasted * grade_mult

            total_storage_cost = STORAGE_COST_PER_KG_PER_WEEK * quantity_kg * weeks_ahead
            potential_advance = current_price * quantity_kg * ADVANCE_PERCENTAGE
            total_interest = potential_advance * WEEKLY_INTEREST_RATE * weeks_ahead

            expected_gross = forecasted * quantity_kg
            expected_net = expected_gross - total_storage_cost - total_interest

            horizon_info = {
                "weeks": weeks_ahead,
                "forecasted_price_per_kg": round(forecasted, 4),
                "storage_cost": round(total_storage_cost, 2),
                "interest": round(total_interest, 2),
                "expected_net": round(expected_net, 2),
                "profit_vs_sell_now": round(expected_net - sell_now_value, 2),
            }
            forecast_breakdown.append(horizon_info)

            if expected_net > best["expected_net_value"]:
                best["decision"] = "Store"
                best["forecasted_price_per_kg"] = round(forecasted, 4)
                best["recommended_weeks"] = weeks_ahead
                best["storage_cost"] = round(total_storage_cost, 2)
                best["advance_interest"] = round(total_interest, 2)
                best["expected_net_value"] = round(expected_net, 2)
                best["advance_offer"] = round(potential_advance, 2)

        # Build reasoning
        if best["decision"] == "Store":
            profit = best["expected_net_value"] - sell_now_value
            best["reasoning"] = (
                f"Selling now yields KES {sell_now_value:,.2f} "
                f"(at {current_price:.2f} KES/Kg). "
                f"Storing for {best['recommended_weeks']} weeks is projected to yield "
                f"KES {best['expected_net_value']:,.2f} after storage costs "
                f"(KES {best['storage_cost']:,.2f}) and advance interest "
                f"(KES {best['advance_interest']:,.2f}), "
                f"a net gain of KES {profit:,.2f}. "
                f"You can receive an immediate cash advance of KES {best['advance_offer']:,.2f}."
            )
        else:
            best["reasoning"] = (
                f"Selling now yields KES {sell_now_value:,.2f} "
                f"(at {current_price:.2f} KES/Kg). "
                f"Forecasted price increases over the next 24 weeks are not projected "
                f"to offset storage and interest costs. Selling now is recommended."
            )

        best["forecast_breakdown"] = forecast_breakdown
        return best
