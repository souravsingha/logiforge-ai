import numpy as np
import pandas as pd

from app.preprocessing import prepare_training_data

from app.forecasting import (
    FEATURE_COLUMNS,
    build_random_forest,
    evaluate_model,
    save_model,
)


# =========================================
# Dataset
# =========================================

DATA_FILE = "data/consumption.csv"


# =========================================
# MAPE Calculation
# =========================================

def calculate_mape(
    actual: pd.Series,
    predicted: np.ndarray,
) -> float:

    actual_values = actual.to_numpy(dtype=float)

    mask = actual_values != 0

    if not mask.any():
        return 0.0

    return float(
        np.mean(
            np.abs(
                (
                    actual_values[mask]
                    - predicted[mask]
                )
                / actual_values[mask]
            )
        )
        * 100
    )


# =========================================
# Moving Average Baseline Evaluation
# =========================================

def evaluate_baseline(
    train: pd.Series,
    test: pd.Series,
    window: int = 7,
) -> dict:

    history = train.astype(float).tolist()

    predictions = []

    for actual in test.astype(float):

        recent = history[-window:]

        prediction = sum(recent) / len(recent)

        predictions.append(prediction)

        # Walk-forward evaluation:
        # after prediction, actual demand
        # becomes available for the next step.
        history.append(actual)

    predictions = np.array(predictions)

    actual = test.to_numpy(dtype=float)

    # MAE
    mae = np.mean(
        np.abs(
            actual - predictions
        )
    )

    # RMSE
    rmse = np.sqrt(
        np.mean(
            (actual - predictions) ** 2
        )
    )

    # MAPE
    mape = calculate_mape(
        test,
        predictions,
    )

    return {
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "mape": round(float(mape), 4),
    }


# =========================================
# Main Training Pipeline
# =========================================

def main():

    print("================================")
    print("LOGIFORGE AI - ML TRAINING")
    print("================================")

    print("\nLoading dataset...")

    # -----------------------------------------
    # Load + preprocess dataset
    # -----------------------------------------

    df = prepare_training_data(
        DATA_FILE
    )

    print(
        f"Total training-ready rows: {len(df)}"
    )

    # -----------------------------------------
    # Select synthetic location + item
    # -----------------------------------------

    series = df[
        (df["location_id"] == "DEPOT-001")
        & (df["item_id"] == "FOOD-001")
    ].copy()

    if series.empty:
        raise ValueError(
            "No data found for DEPOT-001 / FOOD-001"
        )

    series = series.sort_values(
        "date"
    )

    print(
        "\nSelected series:"
    )

    print(
        "Location : DEPOT-001"
    )

    print(
        "Item     : FOOD-001"
    )

    print(
        f"Records  : {len(series)}"
    )

    # -----------------------------------------
    # Train / Test Split
    # -----------------------------------------

    split_index = int(
        len(series) * 0.8
    )

    train = series.iloc[
        :split_index
    ]

    test = series.iloc[
        split_index:
    ]

    print(
        f"\nTraining rows: {len(train)}"
    )

    print(
        f"Testing rows : {len(test)}"
    )

    # =========================================
    # 1. Moving Average Baseline
    # =========================================

    print(
        "\nRunning Moving Average baseline..."
    )

    baseline_metrics = evaluate_baseline(
        train["consumption"],
        test["consumption"],
        window=7,
    )

    # =========================================
    # 2. Random Forest
    # =========================================

    print(
        "Training Random Forest model..."
    )

    X_train = train[
        FEATURE_COLUMNS
    ]

    y_train = train[
        "consumption"
    ]

    X_test = test[
        FEATURE_COLUMNS
    ]

    y_test = test[
        "consumption"
    ]

    model = build_random_forest(
        X_train,
        y_train,
    )

    # =========================================
    # 3. Random Forest Evaluation
    # =========================================

    rf_metrics = evaluate_model(
        model,
        X_test,
        y_test,
    )

    # =========================================
    # 4. Save Trained Model
    # =========================================

    model_path = save_model(
        model
    )

    # =========================================
    # 5. Model Comparison
    # =========================================

    print(
        "\n================================"
    )

    print(
        "MODEL COMPARISON"
    )

    print(
        "================================"
    )

    print(
        "\nMoving Average:"
    )

    print(
        f"MAE  : {baseline_metrics['mae']}"
    )

    print(
        f"RMSE : {baseline_metrics['rmse']}"
    )

    print(
        f"MAPE : {baseline_metrics['mape']}%"
    )

    print(
        "\nRandom Forest:"
    )

    print(
        f"MAE  : {rf_metrics['mae']}"
    )

    print(
        f"RMSE : {rf_metrics['rmse']}"
    )

    print(
        f"MAPE : {rf_metrics['mape']}%"
    )

    # =========================================
    # 6. Model Saved
    # =========================================

    print(
        "\n================================"
    )

    print(
        f"✅ Model saved: {model_path}"
    )

    print(
        "================================"
    )

    print(
        "\nEvaluation complete."
    )

    print(
        "ML training pipeline finished successfully."
    )


# =========================================
# Entry Point
# =========================================

if __name__ == "__main__":
    main()
