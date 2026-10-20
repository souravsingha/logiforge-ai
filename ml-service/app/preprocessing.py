import pandas as pd


REQUIRED_COLUMNS = [
    "date",
    "location_id",
    "item_id",
    "consumption",
]


def load_consumption_data(file_path: str) -> pd.DataFrame:
    """Load and validate the historical consumption dataset."""

    df = pd.read_csv(file_path)

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    df["date"] = pd.to_datetime(df["date"])

    df["consumption"] = pd.to_numeric(
        df["consumption"],
        errors="coerce",
    )

    df = df.dropna(
        subset=[
            "date",
            "location_id",
            "item_id",
            "consumption",
        ]
    )

    df = df[df["consumption"] >= 0]

    df = (
        df.sort_values(
            ["location_id", "item_id", "date"]
        )
        .drop_duplicates(
            subset=["date", "location_id", "item_id"]
        )
        .reset_index(drop=True)
    )

    return df


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create time-series features for demand forecasting."""

    result = df.copy()

    result["day_of_week"] = result["date"].dt.dayofweek
    result["month"] = result["date"].dt.month

    grouped = result.groupby(
        ["location_id", "item_id"],
        group_keys=False,
    )

    result["lag_1"] = grouped["consumption"].shift(1)
    result["lag_7"] = grouped["consumption"].shift(7)

    result["rolling_mean_7"] = (
        grouped["consumption"]
        .transform(
            lambda series: series.shift(1).rolling(7).mean()
        )
    )

    result["rolling_mean_14"] = (
        grouped["consumption"]
        .transform(
            lambda series: series.shift(1).rolling(14).mean()
        )
    )

    return result


def prepare_training_data(
    file_path: str,
) -> pd.DataFrame:
    """Load historical data and prepare ML features."""

    df = load_consumption_data(file_path)

    df = create_features(df)

    # Initial rows do not have enough history for lag/rolling features.
    df = df.dropna(
        subset=[
            "lag_1",
            "lag_7",
            "rolling_mean_7",
            "rolling_mean_14",
        ]
    )

    return df.reset_index(drop=True)