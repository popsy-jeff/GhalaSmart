"""
Production forecaster that loads the trained XGBoost model
and generates price predictions for given counties and time horizons.
"""
import os
import json
import numpy as np
import joblib


MODEL_DIR = os.path.dirname(os.path.abspath(__file__))


class MaizeForecaster:
    """Loads trained XGBoost models and forecasts maize prices."""

    def __init__(self):
        model_path = os.path.join(MODEL_DIR, "model.joblib")
        meta_path = os.path.join(MODEL_DIR, "model_meta.json")
        prices_path = os.path.join(MODEL_DIR, "latest_prices.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Trained model not found at {model_path}. "
                "Run 'python ml/train_model.py' first."
            )

        self.models = joblib.load(model_path)

        with open(meta_path, "r") as f:
            self.meta = json.load(f)

        with open(prices_path, "r") as f:
            self.latest_prices = json.load(f)

        self.feature_columns = self.meta["feature_columns"]
        self.counties = self.meta["counties"]

    def normalize_county(self, county: str) -> str:
        """Normalize county input to match trained model county keys."""
        if not county:
            return self.counties[0] if self.counties else "Uasin-Gishu"
        c = county.strip()
        if c in self.latest_prices:
            return c
        hyphenated = c.replace(" ", "-")
        if hyphenated in self.latest_prices:
            return hyphenated
        for known in self.counties:
            if known.lower() == c.lower() or known.lower() == hyphenated.lower():
                return known
            if known.lower().replace("-", " ") == c.lower().replace("-", " ").replace("county", "").strip():
                return known
        return self.counties[0] if self.counties else "Uasin-Gishu"

    def get_available_counties(self) -> list:
        """Return list of counties the model can forecast for."""
        return self.counties

    def get_current_price(self, county: str) -> float:
        """Return the most recent known wholesale price for a county (KES/Kg)."""
        county = self.normalize_county(county)
        if county not in self.latest_prices:
            return 45.0
        return self.latest_prices[county]["prices"][-1]

    def _build_features(self, price_history: list, week_of_year: int, month: int) -> np.ndarray:
        """Build a single feature vector from a price history list."""
        prices = list(price_history)  # copy

        # Lag features: lag_1w, lag_2w, lag_4w, lag_8w, lag_12w
        def safe_lag(arr, n):
            if n <= len(arr):
                return arr[-n]
            return arr[0]  # fallback to oldest

        features = []
        for lag in [1, 2, 4, 8, 12]:
            features.append(safe_lag(prices, lag))

        # Rolling means: 4w, 8w, 12w (based on shifted prices, i.e., prices[:-1] or all)
        shifted = prices[:-1] if len(prices) > 1 else prices
        for window in [4, 8, 12]:
            w = min(window, len(shifted))
            features.append(np.mean(shifted[-w:]))

        # Rolling std: 4w, 8w
        for window in [4, 8]:
            w = min(window, len(shifted))
            if w >= 2:
                features.append(np.std(shifted[-w:], ddof=1))
            else:
                features.append(0.0)

        # Momentum: 1w, 4w
        for n in [1, 4]:
            if len(shifted) > n:
                features.append(shifted[-1] - shifted[-(1 + n)])
            else:
                features.append(0.0)

        # Calendar
        features.append(week_of_year)
        features.append(month)
        features.append((month - 1) // 3 + 1)  # quarter

        # Cyclical week
        features.append(np.sin(2 * np.pi * week_of_year / 52))
        features.append(np.cos(2 * np.pi * week_of_year / 52))

        return np.array(features).reshape(1, -1)

    def forecast_price(self, county: str, weeks_ahead: int) -> float:
        """
        Forecast the wholesale price (KES/Kg) for a county N weeks into the future.
        Uses iterative forecasting: predicts week-by-week, appending each prediction
        to the price history to forecast further ahead.
        """
        county = self.normalize_county(county)
        if county not in self.models:
            county = list(self.models.keys())[0]

        model = self.models[county]
        prices = list(self.latest_prices[county]["prices"])
        current_week = self.latest_prices[county]["last_week_of_year"]
        current_month = self.latest_prices[county]["last_month"]

        # Iteratively forecast each week
        for step in range(weeks_ahead):
            target_week = (current_week + step) % 52 + 1
            target_month = ((current_month - 1 + (step // 4)) % 12) + 1

            X = self._build_features(prices, target_week, target_month)
            pred = float(model.predict(X)[0])

            # Clamp prediction to reasonable bounds (no negative prices)
            pred = max(pred, 5.0)
            prices.append(pred)

        return round(prices[-1], 4)

    def forecast_prices_range(self, county: str, max_weeks: int = 24) -> list:
        """
        Return a list of (weeks_ahead, forecasted_price) tuples
        for horizons 4, 8, 12, 16, 20, 24 weeks.
        """
        county = self.normalize_county(county)
        if county not in self.models:
            county = list(self.models.keys())[0]

        model = self.models[county]
        prices = list(self.latest_prices[county]["prices"])
        current_week = self.latest_prices[county]["last_week_of_year"]
        current_month = self.latest_prices[county]["last_month"]

        results = []
        horizons = [w for w in [4, 8, 12, 16, 20, 24] if w <= max_weeks]

        # Iteratively forecast week by week up to max_weeks
        for step in range(1, max_weeks + 1):
            target_week = (current_week + step - 1) % 52 + 1
            target_month = ((current_month - 1 + ((step - 1) // 4)) % 12) + 1

            X = self._build_features(prices, target_week, target_month)
            pred = float(model.predict(X)[0])
            pred = max(pred, 5.0)
            prices.append(pred)

            if step in horizons:
                results.append((step, round(pred, 4)))

        return results
