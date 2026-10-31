"""
Seed the price_history table from the agriBORA and KAMIS CSV files.
Run: python db/seed_prices.py
"""
import os
import sys
import pandas as pd
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import engine, Base
from db.models import PriceHistory


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data_raw")


def normalize_county(name: str) -> str:
    """Normalize county names to match across datasets."""
    mapping = {
        "Uasin-Gishu": "Uasin-Gishu",
        "Uasin Gishu": "Uasin-Gishu",
        "uasin gishu": "Uasin-Gishu",
    }
    return mapping.get(name, name.strip())


def seed_kamis():
    """Load KAMIS price data into price_history table."""
    print("Loading KAMIS data...")
    df = pd.read_csv(os.path.join(DATA_DIR, "kamis_maize_prices.csv"))

    # Filter to only Dry_White_Maize for consistency with agriBORA
    df = df[df["Commodity_Classification"] == "Dry_White_Maize"].copy()
    df = df.dropna(subset=["Wholesale"])

    # Aggregate: average wholesale price per county per date
    df_agg = df.groupby(["County", "Date"]).agg(
        wholesale_price=("Wholesale", "mean"),
        week_of_year=("WeekofYear", "first"),
        year_week=("Year_Week", "first"),
    ).reset_index()

    df_agg["county"] = df_agg["County"].apply(normalize_county)
    df_agg["date"] = pd.to_datetime(df_agg["Date"]).dt.date
    df_agg["source"] = "KAMIS"

    records = df_agg[["county", "date", "wholesale_price", "source", "week_of_year", "year_week"]].to_dict("records")

    with engine.begin() as conn:
        for rec in records:
            conn.execute(
                text("""
                    INSERT INTO price_history (county, date, wholesale_price, source, week_of_year, year_week)
                    VALUES (:county, :date, :wholesale_price, :source, :week_of_year, :year_week)
                """),
                rec
            )
    print(f"  Inserted {len(records)} KAMIS price records.")


def seed_agribora():
    """Load agriBORA price data into price_history table."""
    files = [
        "agriBORA_maize_prices.csv",
        "agriBORA_maize_prices_weeks_46_to_51.csv",
    ]

    total = 0
    for fname in files:
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            print(f"  Skipping {fname} (not found)")
            continue

        print(f"Loading {fname}...")
        df = pd.read_csv(path)

        records = []
        for _, row in df.iterrows():
            records.append({
                "county": normalize_county(row["County"]),
                "date": pd.to_datetime(row["Date"]).date(),
                "wholesale_price": float(row["WholeSale"]),
                "source": "AGRIBORA",
                "week_of_year": int(row["WeekofYear"]),
                "year_week": str(row["Year_Week"]),
            })

        with engine.begin() as conn:
            for rec in records:
                conn.execute(
                    text("""
                        INSERT INTO price_history (county, date, wholesale_price, source, week_of_year, year_week)
                        VALUES (:county, :date, :wholesale_price, :source, :week_of_year, :year_week)
                    """),
                    rec
                )
        print(f"  Inserted {len(records)} records from {fname}.")
        total += len(records)

    print(f"  Total agriBORA records: {total}")


def main():
    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("  Tables created.")

    # Clear existing price data
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM price_history"))
    print("  Cleared existing price_history data.")

    seed_kamis()
    seed_agribora()

    # Print summary
    with engine.connect() as conn:
        result = conn.execute(text("SELECT source, COUNT(*) as cnt FROM price_history GROUP BY source"))
        for row in result:
            print(f"  {row[0]}: {row[1]} records")
        result = conn.execute(text("SELECT COUNT(DISTINCT county) FROM price_history"))
        print(f"  Distinct counties: {result.scalar()}")

    print("\nDone! Price history seeded successfully.")


if __name__ == "__main__":
    main()
