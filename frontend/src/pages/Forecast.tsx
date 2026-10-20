import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../lib/api";


// ======================================================
// Types
// ======================================================

type Location = {
  id: string;
  code: string;
  name: string;
  type: string;
};


type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
};


type Forecast = {
  id: string;

  location_id: string;
  item_id: string;

  location_code: string;
  item_name: string;
  category: string;

  forecast_date: string;

  predicted_quantity: number | string;

  model_name: string;
  model_version: string;

  horizon_days: number;

  source: string;
};


// ======================================================
// Page
// ======================================================

export default function ForecastPage() {

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [items, setItems] =
    useState<Item[]>([]);

  const [forecasts, setForecasts] =
    useState<Forecast[]>([]);


  const [locationId, setLocationId] =
    useState("");

  const [itemId, setItemId] =
    useState("");

  const [horizon, setHorizon] =
    useState("7");


  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);


  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // ====================================================
  // Load Initial Data
  // ====================================================

  const loadInitialData = async () => {

    try {

      setLoading(true);
      setError("");

      const [
        locationResponse,
        itemResponse,
        forecastResponse,
      ] = await Promise.all([
        api.get("/locations"),
        api.get("/items"),
        api.get("/forecast"),
      ]);


      const locationData =
        locationResponse.data?.data ?? [];


      const itemData =
        itemResponse.data?.data ?? [];


      const forecastData =
        forecastResponse.data?.data ?? [];


      setLocations(
        Array.isArray(locationData)
          ? locationData
          : []
      );


      setItems(
        Array.isArray(itemData)
          ? itemData
          : []
      );


      setForecasts(
        Array.isArray(forecastData)
          ? forecastData
          : []
      );

    } catch (err: any) {

      console.error(
        "Forecast initialisation error:",
        err
      );


      if (
        err?.response?.status === 401
      ) {

        localStorage.removeItem(
          "logiforge_token"
        );

        localStorage.removeItem(
          "logiforge_user"
        );

        window.location.href =
          "/login";

        return;
      }


      setError(
        err?.response?.data?.message ||
        "Unable to load forecast data."
      );

    } finally {

      setLoading(false);
    }
  };


  // ====================================================
  // Refresh Forecasts
  // ====================================================

  const loadForecasts = async () => {

    try {

      setError("");

      const response =
        await api.get("/forecast");


      const data =
        response.data?.data ?? [];


      setForecasts(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err: any) {

      console.error(
        "Forecast refresh error:",
        err
      );


      if (
        err?.response?.status === 401
      ) {

        localStorage.removeItem(
          "logiforge_token"
        );

        localStorage.removeItem(
          "logiforge_user"
        );

        window.location.href =
          "/login";

        return;
      }


      setError(
        err?.response?.data?.message ||
        "Unable to refresh forecast data."
      );
    }
  };


  // ====================================================
  // Initial Load
  // ====================================================

  useEffect(() => {

    loadInitialData();

  }, []);


  // ====================================================
  // Generate Random Forest Forecast
  // ====================================================

  const generateForecast = async () => {

    setError("");
    setSuccess("");


    // -----------------------------------------------
    // Validate location
    // -----------------------------------------------

    if (!locationId) {

      setError(
        "Please select a location."
      );

      return;
    }


    // -----------------------------------------------
    // Validate item
    // -----------------------------------------------

    if (!itemId) {

      setError(
        "Please select an item."
      );

      return;
    }


    try {

      setGenerating(true);


      // ---------------------------------------------
      // Call Node backend
      // ---------------------------------------------

      const response =
        await api.post(
          "/forecast/run",
          {
            locationId,
            itemId,
            horizon: Number(horizon),
          }
        );


      const generated =
        response.data?.data ?? [];


      // ---------------------------------------------
      // Success message
      // ---------------------------------------------

      setSuccess(
        `Random Forest forecast generated successfully for ${horizon} days.`
      );


      // ---------------------------------------------
      // Add generated records immediately
      // ---------------------------------------------

      if (
        Array.isArray(generated)
      ) {

        const selectedLocation =
          locations.find(
            (location) =>
              location.id === locationId
          );


        const selectedItem =
          items.find(
            (item) =>
              item.id === itemId
          );


        const formattedRows: Forecast[] =
          generated.map(
            (row: any) => ({
              ...row,

              location_code:
                selectedLocation?.code ||
                row.location_code ||
                "—",

              item_name:
                selectedItem?.name ||
                row.item_name ||
                "—",

              category:
                selectedItem?.category ||
                row.category ||
                "—",

              model_name:
                row.model_name ||
                "Random Forest",

              source:
                row.source ||
                "python-ml-service",
            })
          );


        setForecasts(
          (current) => [
            ...current,
            ...formattedRows,
          ]
        );
      }


      // ---------------------------------------------
      // Refresh from PostgreSQL
      // ---------------------------------------------

      await loadForecasts();

    } catch (err: any) {

      console.error(
        "Generate forecast error:",
        err
      );


      if (
        err?.response?.status === 401
      ) {

        localStorage.removeItem(
          "logiforge_token"
        );

        localStorage.removeItem(
          "logiforge_user"
        );

        window.location.href =
          "/login";

        return;
      }


      const message =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Unable to generate forecast.";


      setError(message);

    } finally {

      setGenerating(false);
    }
  };


  // ====================================================
  // KPI Calculations
  // ====================================================

  const totalForecast =
    forecasts.reduce(
      (sum, row) =>
        sum +
        Number(
          row.predicted_quantity || 0
        ),
      0
    );


  const averageDemand =
    forecasts.length > 0
      ? totalForecast /
        forecasts.length
      : 0;


  const locationCount =
    new Set(
      forecasts.map(
        (row) =>
          row.location_code
      )
    ).size;


  // ====================================================
  // Chart Data
  // ====================================================

  const chartData = useMemo(() => {

    return forecasts
      .slice()
      .sort(
        (a, b) =>
          new Date(
            a.forecast_date
          ).getTime() -
          new Date(
            b.forecast_date
          ).getTime()
      )
      .slice(-30)
      .map((row) => ({
        date: new Date(
          row.forecast_date
        ).toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
          }
        ),

        demand: Number(
          row.predicted_quantity
        ),
      }));

  }, [forecasts]);


  // ====================================================
  // Render
  // ====================================================

  return (
    <section className="dashboard-page">

      <div className="dashboard-inner">

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="dash-head">

          <div>

            <span className="status-pill small">

              <i />

              DEMAND INTELLIGENCE

            </span>


            <h1>
              Demand Forecast
            </h1>


            <p>
              Predict future supply demand using
              historical consumption patterns across
              the synthetic logistics network.
            </p>

          </div>


          <button
            className="outline-btn"
            onClick={loadForecasts}
            disabled={
              loading ||
              generating
            }
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              gap: "7px",
            }}
          >

            <RefreshCw
              size={14}
            />

            Refresh

          </button>

        </div>


        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (

          <div
            style={{
              marginBottom: "14px",
              padding: "11px 14px",
              border:
                "1px solid rgba(239,68,68,.2)",
              borderRadius: "10px",
              background:
                "rgba(239,68,68,.06)",
              color: "#ef4444",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>

        )}


        {/* ==========================================
            SUCCESS
        ========================================== */}

        {success && (

          <div
            style={{
              marginBottom: "14px",
              padding: "11px 14px",
              border:
                "1px solid rgba(34,197,94,.2)",
              borderRadius: "10px",
              background:
                "rgba(34,197,94,.06)",
              color: "#22c55e",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {success}
          </div>

        )}


        {/* ==========================================
            FORECAST GENERATOR
        ========================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h2>
                Generate Demand Forecast
              </h2>

              <p>
                Select a location, supply item and
                prediction horizon.
              </p>

            </div>


            <Sparkles
              size={18}
              color="var(--accent)"
            />

          </div>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "12px",
            }}
          >

            {/* LOCATION */}

            <div>

              <label
                style={labelStyle}
              >
                LOCATION
              </label>


              <select
                value={locationId}
                onChange={(e) =>
                  setLocationId(
                    e.target.value
                  )
                }
                style={selectStyle}
              >

                <option value="">
                  Select location
                </option>


                {locations.map(
                  (location) => (

                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.code} —{" "}
                      {location.name}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* ITEM */}

            <div>

              <label
                style={labelStyle}
              >
                SUPPLY ITEM
              </label>


              <select
                value={itemId}
                onChange={(e) =>
                  setItemId(
                    e.target.value
                  )
                }
                style={selectStyle}
              >

                <option value="">
                  Select item
                </option>


                {items.map(
                  (item) => (

                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} —{" "}
                      {item.category}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* HORIZON */}

            <div>

              <label
                style={labelStyle}
              >
                FORECAST HORIZON
              </label>


              <select
                value={horizon}
                onChange={(e) =>
                  setHorizon(
                    e.target.value
                  )
                }
                style={selectStyle}
              >

                <option value="7">
                  7 Days
                </option>

                <option value="14">
                  14 Days
                </option>

                <option value="30">
                  30 Days
                </option>

              </select>

            </div>

          </div>


          {/* Generate Button */}

          <button
            className="primary-btn"
            onClick={generateForecast}
            disabled={
              generating ||
              !locationId ||
              !itemId
            }
            style={{
              marginTop: "16px",

              opacity:
                generating ||
                !locationId ||
                !itemId
                  ? 0.55
                  : 1,
            }}
          >

            {generating ? (

              <>
                <RefreshCw
                  size={15}
                  className="spin"
                />

                Generating...

              </>

            ) : (

              <>
                <TrendingUp
                  size={15}
                />

                Generate Forecast

              </>

            )}

          </button>

        </div>


        {/* ==========================================
            KPI
        ========================================== */}

        <div className="stat-grid">

          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon">
                <Activity
                  size={17}
                />
              </div>

            </div>


            <b>
              {loading
                ? "—"
                : forecasts.length}
            </b>


            <small>
              FORECAST RECORDS
            </small>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon">
                <TrendingUp
                  size={17}
                />
              </div>

            </div>


            <b>
              {loading
                ? "—"
                : averageDemand.toFixed(1)}
            </b>


            <small>
              AVG. DAILY DEMAND
            </small>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon">
                <CalendarDays
                  size={17}
                />
              </div>

            </div>


            <b>
              {loading
                ? "—"
                : locationCount}
            </b>


            <small>
              LOCATIONS COVERED
            </small>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon">
                <AlertTriangle
                  size={17}
                />
              </div>

            </div>


            <b>

              {forecasts.length > 0
                ? forecasts[
                    forecasts.length - 1
                  ].model_name
                : "—"}

            </b>


            <small>
              FORECAST MODEL
            </small>

          </div>

        </div>


        {/* ==========================================
            CHART
        ========================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h2>
                Predicted Demand Trend
              </h2>

              <p>
                Forecasted demand across the
                available prediction horizon.
              </p>

            </div>


            <span className="panel-tag">
              RANDOM FOREST
            </span>

          </div>


          <div className="chart">

            {chartData.length === 0 ? (

              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems:
                    "center",
                  color:
                    "var(--muted)",
                  fontSize: "11px",
                }}
              >
                No forecast data available.
                Generate a forecast to populate
                this chart.
              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >

                  <CartesianGrid
                    stroke="currentColor"
                    opacity={0.07}
                    vertical={false}
                  />


                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 8,
                      fill:
                        "currentColor",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />


                  <YAxis
                    tick={{
                      fontSize: 8,
                      fill:
                        "currentColor",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />


                  <Tooltip />


                  <Line
                    type="monotone"
                    dataKey="demand"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>


        {/* ==========================================
            RECORDS
        ========================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h2>
                Forecast Records
              </h2>

              <p>
                Location and item-level predicted
                demand.
              </p>

            </div>


            <span className="panel-tag">
              {forecasts.length} RECORDS
            </span>

          </div>


          <div
            style={{
              overflowX:
                "auto",
            }}
          >

            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
              }}
            >

              <thead>

                <tr>

                  <th
                    style={thStyle}
                  >
                    DATE
                  </th>

                  <th
                    style={thStyle}
                  >
                    ITEM
                  </th>

                  <th
                    style={thStyle}
                  >
                    CATEGORY
                  </th>

                  <th
                    style={thStyle}
                  >
                    LOCATION
                  </th>

                  <th
                    style={thStyle}
                  >
                    PREDICTED DEMAND
                  </th>

                  <th
                    style={thStyle}
                  >
                    MODEL
                  </th>

                  <th
                    style={thStyle}
                  >
                    HORIZON
                  </th>

                </tr>

              </thead>


              <tbody>

                {forecasts.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      style={
                        emptyStyle
                      }
                    >
                      No forecast records yet.
                    </td>

                  </tr>

                ) : (

                  forecasts.map(
                    (row) => (

                      <tr
                        key={row.id}
                      >

                        <td
                          style={tdStyle}
                        >
                          {new Date(
                            row.forecast_date
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>


                        <td
                          style={tdStyle}
                        >
                          <strong>
                            {row.item_name ||
                              "—"}
                          </strong>
                        </td>


                        <td
                          style={tdStyle}
                        >
                          {row.category ||
                            "—"}
                        </td>


                        <td
                          style={tdStyle}
                        >
                          {row.location_code ||
                            "—"}
                        </td>


                        <td
                          style={tdStyle}
                        >
                          <strong>
                            {Number(
                              row.predicted_quantity
                            ).toFixed(2)}
                          </strong>
                        </td>


                        <td
                          style={tdStyle}
                        >
                          <span className="inventory-status green">
                            {row.model_name ||
                              "Random Forest"}
                          </span>
                        </td>


                        <td
                          style={tdStyle}
                        >
                          {row.horizon_days}
                          {" "}
                          days
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>


        {/* ==========================================
            EXPLAINABILITY
        ========================================== */}

        <div className="human-note">

          <span>●</span>

          <span>
            Forecasts use the Random Forest model
            trained on synthetic historical
            consumption data. Outputs are
            decision-support signals and remain
            subject to human review.
          </span>

        </div>

      </div>

    </section>
  );
}


// ======================================================
// Styles
// ======================================================

const labelStyle: React.CSSProperties = {

  display: "block",

  marginBottom: "7px",

  fontSize: "8px",

  fontWeight: 800,

  letterSpacing: ".08em",

  color: "var(--muted)",
};


const selectStyle: React.CSSProperties = {

  width: "100%",

  minHeight: "42px",

  padding: "0 12px",

  border:
    "1px solid var(--line)",

  borderRadius: "10px",

  background:
    "var(--surface2)",

  color:
    "var(--text)",

  outline: "none",

  fontSize: "11px",
};


const thStyle: React.CSSProperties = {

  textAlign: "left",

  padding: "12px",

  fontSize: "8px",

  letterSpacing: ".08em",

  color:
    "var(--muted)",

  borderBottom:
    "1px solid var(--line)",

  whiteSpace:
    "nowrap",
};


const tdStyle: React.CSSProperties = {

  padding:
    "13px 12px",

  fontSize: "10px",

  color:
    "var(--text)",

  borderBottom:
    "1px solid var(--line)",

  whiteSpace:
    "nowrap",
};


const emptyStyle: React.CSSProperties = {

  textAlign: "center",

  padding:
    "40px 20px",

  color:
    "var(--muted)",

  fontSize: "10px",
};