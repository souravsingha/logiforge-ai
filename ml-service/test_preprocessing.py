from app.preprocessing import prepare_training_data
from app.forecasting import forecast_for_series


DATA_FILE = "data/consumption.csv"

df = prepare_training_data(DATA_FILE)

forecast = forecast_for_series(
    df=df,
    location_id="LOC-001",
    item_id="FOOD-001",
    forecast_days=7,
    window=7,
)

print("\n✅ Moving Average Forecast")
print("Location: LOC-001")
print("Item: FOOD-001")
print("Next 7 days:")

for day, value in enumerate(forecast, start=1):
    print(f"Day {day}: {value}")