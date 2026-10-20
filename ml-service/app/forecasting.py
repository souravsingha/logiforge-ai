import numpy as np
import pandas as pd
import joblib

from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


FEATURE_COLUMNS = [
    "day_of_week",
    "month",
    "lag_1",
    "lag_7",
    "rolling_mean_7",
    "rolling_mean_14",
]


# =========================================
# Moving Average Forecast
# =========================================

def moving_average_forecast(
    history: pd.Series,
    forecast_days: int = 7,
    window: int = 7,
) -> list[float]:

    if history.empty:
        raise ValueError("Historical demand data is empty.")

    if len(history) < window:
        raise ValueError(
            f"At least {window} historical values are required."
        )

    values = history.astype(float).tolist()
    predictions = []

    for _ in range(forecast_days):

        recent_values = values[-window:]

        prediction = sum(recent_values) / len(recent_values)

        predictions.append(round(prediction, 2))

        values.append(prediction)

    return predictions


# =========================================
# Random Forest Model
# =========================================

def build_random_forest(
    X_train: pd.DataFrame,
    y_train: pd.Series,
) -> RandomForestRegressor:

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    return model


# =========================================
# Model Evaluation
# =========================================

def evaluate_model(
    model,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict:

    predictions = model.predict(X_test)

    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions,
        )
    )

    non_zero_actual = y_test.replace(
        0,
        np.nan,
    )

    mape = (
        np.abs(
            (y_test - predictions)
            / non_zero_actual
        )
    ).dropna().mean() * 100

    return {
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "mape": round(float(mape), 4),
    }


# =========================================
# Model Save / Load
# =========================================

MODEL_DIR = Path("models")

MODEL_PATH = (
    MODEL_DIR / "demand_forecast_model.joblib"
)


def save_model(model) -> str:

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_PATH,
    )

    return str(MODEL_PATH)


def load_model():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    return joblib.load(MODEL_PATH)