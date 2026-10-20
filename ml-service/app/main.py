from datetime import timedelta
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.forecasting import (
    FEATURE_COLUMNS,
    load_model,
)


# =========================================
# FastAPI Application
# =========================================

app = FastAPI(
    title="LOGIFORGE AI ML Service",
    description="Demand forecasting service for LOGIFORGE AI",
    version="1.0.0",
)


# =========================================
# Paths
# =========================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = (
    BASE_DIR / "data" / "consumption.csv"
)


# =========================================
# Request Schema
# =========================================

class ForecastRequest(BaseModel):

    location_id: str

    item_id: str

    days: int = 7


# =========================================
# Health Check
# =========================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "logiforge-ml",
    }


# =========================================
# Forecast Prediction
# =========================================

@app.post("/predict")
def predict(
    request: ForecastRequest,
):

    # -----------------------------------------
    # Validate forecast days
    # -----------------------------------------

    if request.days < 1 or request.days > 30:

        raise HTTPException(
            status_code=400,
            detail="days must be between 1 and 30",
        )

    # -----------------------------------------
    # Check dataset
    # -----------------------------------------

    if not DATA_FILE.exists():

        raise HTTPException(
            status_code=500,
            detail="Consumption dataset not found",
        )

    try:

        # -----------------------------------------
        # Load trained model
        # -----------------------------------------

        model = load_model()

        # -----------------------------------------
        # Load historical data
        # -----------------------------------------

        df = pd.read_csv(
            DATA_FILE
        )

        df["date"] = pd.to_datetime(
            df["date"]
        )

        # -----------------------------------------
        # Filter location + item
        # -----------------------------------------

        series = df[
            (df["location_id"] == request.location_id)
            & (df["item_id"] == request.item_id)
        ].copy()

        if series.empty:

            raise HTTPException(
                status_code=404,
                detail=(
                    f"No historical data found for "
                    f"{request.location_id} / "
                    f"{request.item_id}"
                ),
            )

        # -----------------------------------------
        # Sort by date
        # -----------------------------------------

        series = series.sort_values(
            "date"
        )

        # -----------------------------------------
        # Historical consumption
        # -----------------------------------------

        values = (
            series["consumption"]
            .astype(float)
            .tolist()
        )

        if len(values) < 14:

            raise HTTPException(
                status_code=400,
                detail=(
                    "At least 14 historical "
                    "records are required"
                ),
            )

        # -----------------------------------------
        # Last historical date
        # -----------------------------------------

        last_date = series[
            "date"
        ].iloc[-1]

        predictions = []

        # =========================================
        # Recursive Forecasting
        # =========================================

        for _ in range(request.days):

            current_date = (
                last_date
                + timedelta(days=1)
            )

            # -------------------------------------
            # Feature generation
            # -------------------------------------

            day_of_week = (
                current_date.dayofweek
            )

            month = (
                current_date.month
            )

            lag_1 = values[-1]

            lag_7 = values[-7]

            rolling_mean_7 = (
                sum(values[-7:]) / 7
            )

            rolling_mean_14 = (
                sum(values[-14:]) / 14
            )

            # -------------------------------------
            # Create model input
            # -------------------------------------

            features = pd.DataFrame(
                [
                    {
                        "day_of_week": day_of_week,
                        "month": month,
                        "lag_1": lag_1,
                        "lag_7": lag_7,
                        "rolling_mean_7": rolling_mean_7,
                        "rolling_mean_14": rolling_mean_14,
                    }
                ]
            )

            features = features[
                FEATURE_COLUMNS
            ]

            # -------------------------------------
            # Predict
            # -------------------------------------

            prediction = float(
                model.predict(
                    features
                )[0]
            )

            # Demand cannot be negative
            prediction = max(
                0,
                round(prediction, 2),
            )

            # -------------------------------------
            # Store prediction
            # -------------------------------------

            predictions.append(
                {
                    "date": (
                        current_date
                        .date()
                        .isoformat()
                    ),
                    "predicted_demand": prediction,
                }
            )

            # -------------------------------------
            # Recursive prediction
            # -------------------------------------

            values.append(
                prediction
            )

            last_date = current_date

        # =========================================
        # Response
        # =========================================

        return {
            "location_id": request.location_id,
            "item_id": request.item_id,
            "forecast_days": request.days,
            "model": "RandomForest",
            "forecast": predictions,
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )