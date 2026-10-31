"""
XGBoost model training pipeline for maize price forecasting.
Uses KAMIS + agriBORA historical price data with time-series feature engineering.

Run from backend directory:
    python ml/train_model.py
"""
import os
import sys
import json
import warnings

import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

warnings.filterwarnings("ignore")

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data_raw")
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))


def normalize_county(name: str) -> str:
    mapping = {
        "Uasin Gishu": "Uasin-Gishu",
        "uasin gishu": "Uasin-Gishu",
    }
    return mapping.get(name, name.strip())


def load_and_prepare_data() -> pd.DataFrame:
    """Load all CSV datasets and produce a unified weekly price DataFrame."""

    # --- KAMIS data ---
    kamis = pd.read_csv(os.path.join(DATA_DIR, "kamis_maize_prices.csv"))
    kamis = kamis[kamis["Commodity_Classification"] == "Dry_White_Maize"].copy()
    kamis["Date"] = pd.to_datetime(kamis["Date"])
    kamis["County"] = kamis["County"].apply(normalize_county)
    # Aggregate to weekly average wholesale price per county
    kamis_weekly = (
        kamis.groupby(["County", "Year_Week"])
        .agg(
            WholeSale=("Wholesale", "mean"),
            Date=("Date", "first"),
            WeekofYear=("WeekofYear", "first"),
        )
        .reset_index()
    )
    kamis_weekly["source"] = "KAMIS"

    # --- agriBORA data ---
    agri = pd.read_csv(os.path.join(DATA_DIR, "agriBORA_maize_prices.csv"))
    agri_ext = pd.read_csv(os.path.join(DATA_DIR, "agriBORA_maize_prices_weeks_46_to_51.csv"))
    agri_all = pd.concat([agri, agri_ext], ignore_index=True)
    agri_all["Date"] = pd.to_datetime(agri_all["Date"])
    agri_all["County"] = agri_all["County"].apply(normalize_county)
    agri_all = agri_all.rename(columns={"Year_Week": "Year_Week", "WholeSale": "WholeSale"})
    agri_all["source"] = "AGRIBORA"

    # Combine
    cols = ["County", "Year_Week", "WholeSale", "Date", "WeekofYear", "source"]
    combined = pd.concat(
        [kamis_weekly[cols], agri_all[cols]],
        ignore_index=True,
    )

    # If duplicate county+week from both sources, prefer agriBORA (more granular transaction data)
    combined = combined.sort_values("source", ascending=False)  # KAMIS first, then AGRIBORA overrides
    combined = combined.drop_duplicates(subset=["County", "Year_Week"], keep="last")
    combined = combined.sort_values(["County", "Date"]).reset_index(drop=True)

    return combined


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create time-series features per county."""

    all_features = []

    for county, group in df.groupby("County"):
        g = group.sort_values("Date").copy()
        g["price"] = g["WholeSale"].astype(float)

        # Lag features
        for lag in [1, 2, 4, 8, 12]:
            g[f"lag_{lag}w"] = g["price"].shift(lag)

        # Rolling mean features
        for window in [4, 8, 12]:
            g[f"rolling_mean_{window}w"] = g["price"].shift(1).rolling(window, min_periods=1).mean()

        # Rolling std (volatility)
        for window in [4, 8]:
            g[f"rolling_std_{window}w"] = g["price"].shift(1).rolling(window, min_periods=2).std()

        # Price momentum (change over N weeks)
        for n in [1, 4]:
            g[f"momentum_{n}w"] = g["price"].shift(1) - g["price"].shift(1 + n)

        # Calendar features
        g["week_of_year"] = g["WeekofYear"].astype(int)
        g["month"] = g["Date"].dt.month
        g["quarter"] = g["Date"].dt.quarter

        # Cyclical encoding of week
        g["week_sin"] = np.sin(2 * np.pi * g["week_of_year"] / 52)
        g["week_cos"] = np.cos(2 * np.pi * g["week_of_year"] / 52)

        # County encoded
        g["county_name"] = county

        all_features.append(g)

    result = pd.concat(all_features, ignore_index=True)
    result = result.dropna()  # Drop rows where lag features are NaN

    return result


def get_feature_columns() -> list:
    """Return the list of feature column names used for training."""
    features = []
    for lag in [1, 2, 4, 8, 12]:
        features.append(f"lag_{lag}w")
    for window in [4, 8, 12]:
        features.append(f"rolling_mean_{window}w")
    for window in [4, 8]:
        features.append(f"rolling_std_{window}w")
    for n in [1, 4]:
        features.append(f"momentum_{n}w")
    features += ["week_of_year", "month", "quarter", "week_sin", "week_cos"]
    return features


def train_model():
    """Main training pipeline."""
    print("=" * 60)
    print("GhalaSmart XGBoost Training Pipeline")
    print("=" * 60)

    # 1. Load data
    print("\n[1/4] Loading and preparing data...")
    df = load_and_prepare_data()
    counties = sorted(df["County"].unique())
    print(f"  Counties: {counties}")
    print(f"  Total weekly records: {len(df)}")

    # 2. Feature engineering
    print("\n[2/4] Engineering features...")
    df_feat = engineer_features(df)
    feature_cols = get_feature_columns()
    print(f"  Feature columns ({len(feature_cols)}): {feature_cols}")
    print(f"  Training-ready samples: {len(df_feat)}")

    # 3. Time-respecting train/validation split
    # Use last 20% of time period as validation
    print("\n[3/4] Training XGBoost model (per-county)...")
    all_train_preds = []
    all_val_preds = []
    models = {}

    for county in counties:
        county_data = df_feat[df_feat["county_name"] == county].sort_values("Date")
        if len(county_data) < 20:
            print(f"  Skipping {county} (too few samples: {len(county_data)})")
            continue

        split_idx = int(len(county_data) * 0.8)
        train = county_data.iloc[:split_idx]
        val = county_data.iloc[split_idx:]

        X_train = train[feature_cols].values
        y_train = train["price"].values
        X_val = val[feature_cols].values
        y_val = val["price"].values

        model = XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            verbosity=0,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        train_pred = model.predict(X_train)
        val_pred = model.predict(X_val)

        train_mae = mean_absolute_error(y_train, train_pred)
        val_mae = mean_absolute_error(y_val, val_pred)
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))

        print(f"  {county}: Train MAE={train_mae:.4f}, Val MAE={val_mae:.4f}, Val RMSE={val_rmse:.4f} ({len(train)} train, {len(val)} val)")

        models[county] = model
        all_val_preds.extend(zip(y_val, val_pred))

    # Overall validation metrics
    if all_val_preds:
        y_true = [p[0] for p in all_val_preds]
        y_pred = [p[1] for p in all_val_preds]
        overall_mae = mean_absolute_error(y_true, y_pred)
        overall_rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        print(f"\n  Overall Validation: MAE={overall_mae:.4f}, RMSE={overall_rmse:.4f}")

    # 4. Save artifacts
    print("\n[4/4] Saving model artifacts...")
    model_path = os.path.join(MODEL_DIR, "model.joblib")
    joblib.dump(models, model_path)
    print(f"  Saved models to {model_path}")

    # Save metadata
    meta = {
        "feature_columns": feature_cols,
        "counties": counties,
        "training_samples": len(df_feat),
        "validation_mae": round(overall_mae, 4) if all_val_preds else None,
        "validation_rmse": round(overall_rmse, 4) if all_val_preds else None,
    }
    meta_path = os.path.join(MODEL_DIR, "model_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Saved metadata to {meta_path}")

    # Save the latest prices per county for forecasting bootstrap
    latest_prices = {}
    for county in counties:
        county_data = df_feat[df_feat["county_name"] == county].sort_values("Date")
        if len(county_data) > 0:
            last_rows = county_data.tail(12)  # Keep last 12 weeks of prices
            latest_prices[county] = {
                "prices": last_rows["price"].tolist(),
                "dates": last_rows["Date"].dt.strftime("%Y-%m-%d").tolist(),
                "last_week_of_year": int(last_rows.iloc[-1]["week_of_year"]),
                "last_month": int(last_rows.iloc[-1]["month"]),
            }
    prices_path = os.path.join(MODEL_DIR, "latest_prices.json")
    with open(prices_path, "w") as f:
        json.dump(latest_prices, f, indent=2)
    print(f"  Saved latest prices to {prices_path}")

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)


if __name__ == "__main__":
    train_model()
