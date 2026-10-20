import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path


# Keep dataset generation reproducible
random.seed(42)


# ============================================================
# Configuration
# ============================================================

OUTPUT_FILE = Path("data/consumption.csv")


# These location codes MUST match the PostgreSQL locations table.
LOCATIONS = [
    "DEPOT-001",
    "DEPOT-002",
    "LOC-A01",
    "LOC-B02",
    "LOC-C03",
    "LOC-D04",
]


# These item codes MUST match the PostgreSQL items table.
ITEMS = [
    ("FOOD-001", "Food & Rations", 85),
    ("FUEL-001", "Fuel", 120),
    ("MED-001", "Medical", 35),
    ("MAINT-001", "Maintenance", 28),
    ("ESS-001", "Essentials", 45),
]


# Historical data starts from this date.
START_DATE = date(2025, 1, 1)

# 540 days of historical consumption data.
DAYS = 540


# ============================================================
# Synthetic Consumption Generator
# ============================================================

def generate_consumption(
    base_demand: float,
    day_index: int
) -> int:
    """
    Generate realistic synthetic daily consumption.

    Includes:
    - weekly seasonality
    - gradual demand trend
    - random variation
    - occasional demand spikes
    """

    # Weekly seasonality
    weekly_pattern = (
        1
        + 0.08 * math.sin(
            2 * math.pi * day_index / 7
        )
    )

    # Gradual long-term trend
    trend = 1 + (0.00015 * day_index)

    # Random day-to-day variation
    noise = random.uniform(0.90, 1.10)

    # Occasional demand spike
    spike = 1.0

    if random.random() < 0.025:
        spike = random.uniform(1.20, 1.50)

    demand = (
        base_demand
        * weekly_pattern
        * trend
        * noise
        * spike
    )

    return max(1, round(demand))


# ============================================================
# Dataset Generation
# ============================================================

def main():
    # Create data directory if it doesn't exist.
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    rows = []

    # Loop through every location.
    for location_index, location_id in enumerate(LOCATIONS):

        # Give each location a slightly different demand level.
        location_factor = (
            1 + (location_index * 0.06)
        )

        # Loop through every item.
        for item_id, _, base_demand in ITEMS:

            adjusted_base = (
                base_demand * location_factor
            )

            # Generate daily consumption.
            for day_index in range(DAYS):

                current_date = (
                    START_DATE
                    + timedelta(days=day_index)
                )

                consumption = generate_consumption(
                    adjusted_base,
                    day_index
                )

                rows.append(
                    {
                        "date": current_date.isoformat(),
                        "location_id": location_id,
                        "item_id": item_id,
                        "consumption": consumption,
                    }
                )

    # ========================================================
    # Write CSV
    # ========================================================

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "date",
                "location_id",
                "item_id",
                "consumption",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

    # ========================================================
    # Output Summary
    # ========================================================

    print("✅ Synthetic dataset generated successfully.")
    print(f"📁 File: {OUTPUT_FILE}")
    print(f"📍 Locations: {len(LOCATIONS)}")
    print(f"📦 Items: {len(ITEMS)}")
    print(f"📅 Days per combination: {DAYS}")
    print(f"📊 Records: {len(rows):,}")


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":
    main()