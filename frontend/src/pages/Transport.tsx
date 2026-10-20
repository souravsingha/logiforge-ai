import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  Activity,
  CheckCircle2,
  MapPinned,
  RefreshCw,
  Truck,
} from "lucide-react";

import api from "../lib/api";
import LogisticsMap from "../components/logistics/LogisticsMap";

type TransportAsset = {
  id: string;
  vehicle_code: string;
  asset_type: string;
  capacity: number | string;
  capacity_unit: string;
  status: string;
  availability_percent: number | string;
  current_location_id?: string | null;
  updated_at: string;
};

type TransportRoute = {
  id: string;
  route_code: string;
  from_location_id: string;
  to_location_id: string;
  from_code?: string;
  to_code?: string;
  distance_km: number | string;
  estimated_time_hours: number | string;
  capacity: number | string;
  road_condition: string;
  weather_impact: string;
  availability_percent: number | string;
  modeled_cost: number | string;
  is_available: boolean;
};

type MapLocation = {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
};

export default function Transport() {
  const [assets, setAssets] = useState<TransportAsset[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [locations, setLocations] = useState<MapLocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [assetFilter, setAssetFilter] = useState("ALL");
  const [routeFilter, setRouteFilter] = useState("ALL");

  // =========================================================
  // LOAD TRANSPORT DATA
  // =========================================================

  const loadTransport = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        assetsResponse,
        routesResponse,
        locationsResponse,
      ] = await Promise.all([
        api.get("/transport/assets"),
        api.get("/transport/routes"),
        api.get("/locations"),
      ]);

      setAssets(assetsResponse.data?.data || []);

      setRoutes(routesResponse.data?.data || []);

      setLocations(
        (locationsResponse.data?.data || []).map(
          (location: any) => ({
            id: location.id,
            code: location.code,
            name: location.name,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
          }),
        ),
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load transport data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransport();
  }, []);

  // =========================================================
  // ASSET STATS
  // =========================================================

  const assetStats = useMemo(
    () => ({
      total: assets.length,

      available: assets.filter(
        (asset) => asset.status === "AVAILABLE",
      ).length,

      transit: assets.filter(
        (asset) => asset.status === "IN_TRANSIT",
      ).length,

      maintenance: assets.filter(
        (asset) => asset.status === "MAINTENANCE",
      ).length,
    }),
    [assets],
  );

  // =========================================================
  // ROUTE STATS
  // =========================================================

  const routeStats = useMemo(
    () => ({
      total: routes.length,

      available: routes.filter(
        (route) => route.is_available,
      ).length,

      unavailable: routes.filter(
        (route) => !route.is_available,
      ).length,

      disrupted: routes.filter(
        (route) =>
          route.weather_impact !== "LOW" ||
          route.road_condition !== "NORMAL",
      ).length,
    }),
    [routes],
  );

  // =========================================================
  // FILTER ASSETS
  // =========================================================

  const filteredAssets = useMemo(() => {
    if (assetFilter === "ALL") {
      return assets;
    }

    return assets.filter(
      (asset) => asset.status === assetFilter,
    );
  }, [assets, assetFilter]);

  // =========================================================
  // FILTER ROUTES
  // =========================================================

  const filteredRoutes = useMemo(() => {
    if (routeFilter === "ALL") {
      return routes;
    }

    if (routeFilter === "AVAILABLE") {
      return routes.filter(
        (route) => route.is_available,
      );
    }

    if (routeFilter === "UNAVAILABLE") {
      return routes.filter(
        (route) => !route.is_available,
      );
    }

    if (routeFilter === "DISRUPTED") {
      return routes.filter(
        (route) =>
          route.weather_impact !== "LOW" ||
          route.road_condition !== "NORMAL",
      );
    }

    return routes;
  }, [routes, routeFilter]);

  // =========================================================
  // ASSET STATUS
  // =========================================================

  const assetStatusClass = (status: string) => {
    if (status === "AVAILABLE") {
      return "green";
    }

    if (
      status === "IN_TRANSIT" ||
      status === "ASSIGNED"
    ) {
      return "amber";
    }

    return "red";
  };

  // =========================================================
  // ROUTE STATUS
  // =========================================================

  const routeStatusClass = (
    route: TransportRoute,
  ) => {
    if (!route.is_available) {
      return "red";
    }

    if (
      route.weather_impact !== "LOW" ||
      route.road_condition !== "NORMAL"
    ) {
      return "amber";
    }

    return "green";
  };

  // =========================================================
  // NUMBER FORMATTER
  // =========================================================

  const formatNumber = (
    value: number | string,
  ) => {
    return Number(value).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      },
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <section className="dashboard-page">
      <div className="dashboard-inner">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="dash-head">
          <div>
            <span className="eyebrow">
              TRANSPORT & MOBILITY
            </span>

            <h1>
              Transport Planning
            </h1>

            <p>
              Monitor transport assets,
              route availability and
              forward movement capacity.
            </p>
          </div>

          <button
            className="outline-btn"
            onClick={loadTransport}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={
                loading ? "spin" : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            className="human-note"
            style={{
              marginBottom: 16,
              borderColor: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        {/* =====================================================
            TRANSPORT KPI
        ====================================================== */}

        <div className="stat-grid">

          <div className="stat-card">
            <div className="stat-icon">
              <Truck size={18} />
            </div>

            <span>
              Total Assets
            </span>

            <strong>
              {assetStats.total}
            </strong>

            <small>
              Registered transport
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle2 size={18} />
            </div>

            <span>
              Available Assets
            </span>

            <strong>
              {assetStats.available}
            </strong>

            <small>
              Ready for assignment
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={18} />
            </div>

            <span>
              In Transit
            </span>

            <strong>
              {assetStats.transit}
            </strong>

            <small>
              Currently moving
            </small>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <MapPinned size={18} />
            </div>

            <span>
              Available Routes
            </span>

            <strong>
              {routeStats.available}
            </strong>

            <small>
              {routeStats.disrupted} affected
            </small>
          </div>

        </div>

        {/* =====================================================
            TRANSPORT ASSETS
        ====================================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>
              <h3>
                Transport Assets
              </h3>

              <span>
                Vehicle availability and capacity
              </span>
            </div>

            <select
              value={assetFilter}
              onChange={(e) =>
                setAssetFilter(
                  e.target.value,
                )
              }
              style={selectStyle}
            >
              <option value="ALL">
                All Assets
              </option>

              <option value="AVAILABLE">
                Available
              </option>

              <option value="ASSIGNED">
                Assigned
              </option>

              <option value="IN_TRANSIT">
                In Transit
              </option>

              <option value="MAINTENANCE">
                Maintenance
              </option>

              <option value="UNAVAILABLE">
                Unavailable
              </option>
            </select>

          </div>

          {loading ? (
            <Loading />
          ) : filteredAssets.length === 0 ? (
            <EmptyState
              icon={
                <Truck size={36} />
              }
              title="No transport assets"
              message="No assets match the selected filter."
            />
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >

              <table style={tableStyle}>

                <thead>
                  <tr>

                    <th style={thStyle}>
                      Vehicle
                    </th>

                    <th style={thStyle}>
                      Type
                    </th>

                    <th style={thStyle}>
                      Capacity
                    </th>

                    <th style={thStyle}>
                      Status
                    </th>

                    <th style={thStyle}>
                      Availability
                    </th>

                    <th style={thStyle}>
                      Updated
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredAssets.map(
                    (asset) => (
                      <tr
                        key={asset.id}
                      >

                        <td style={tdStyle}>
                          <b>
                            {
                              asset.vehicle_code
                            }
                          </b>
                        </td>

                        <td style={tdStyle}>
                          {
                            asset.asset_type
                          }
                        </td>

                        <td style={tdStyle}>
                          {formatNumber(
                            asset.capacity,
                          )}{" "}
                          {
                            asset.capacity_unit
                          }
                        </td>

                        <td style={tdStyle}>

                          <span
                            className={`inventory-status ${assetStatusClass(
                              asset.status,
                            )}`}
                          >
                            {
                              asset.status
                            }
                          </span>

                        </td>

                        <td style={tdStyle}>

                          <div
                            style={{
                              minWidth: 110,
                            }}
                          >

                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                marginBottom: 5,
                                fontSize: 11,
                              }}
                            >

                              <span>
                                {
                                  formatNumber(
                                    asset.availability_percent,
                                  )
                                }
                                %
                              </span>

                            </div>

                            <div
                              style={{
                                height: 6,
                                borderRadius: 10,
                                background:
                                  "var(--line)",
                                overflow:
                                  "hidden",
                              }}
                            >

                              <div
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      Number(
                                        asset.availability_percent,
                                      ),
                                    ),
                                  )}%`,
                                  height:
                                    "100%",
                                  background:
                                    "var(--accent)",
                                }}
                              />

                            </div>

                          </div>

                        </td>

                        <td style={tdStyle}>

                          {new Date(
                            asset.updated_at,
                          ).toLocaleString(
                            "en-IN",
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            },
                          )}

                        </td>

                      </tr>
                    ),
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* =====================================================
            GIS PLANNING MAP
        ====================================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>
              <h3>
                Logistics Network Map
              </h3>

              <span>
                Synthetic GIS planning visualization
              </span>
            </div>

          </div>

          {loading ? (
            <Loading />
          ) : locations.length === 0 ? (
            <EmptyState
              icon={
                <MapPinned size={36} />
              }
              title="No locations available"
              message="No active planning locations are available for map visualization."
            />
          ) : (
            <LogisticsMap
              locations={locations.map(
                (location) => ({
                  id: location.id,
                  code: location.code,
                  name: location.name,
                  lat: location.latitude,
                  lng: location.longitude,
                }),
              )}

              routes={routes.map(
                (route) => ({
                  id: route.id,
                  route_code:
                    route.route_code,
                  from_code:
                    route.from_code || "",
                  to_code:
                    route.to_code || "",
                  distance_km:
                    route.distance_km,
                  estimated_time_hours:
                    route.estimated_time_hours,
                  road_condition:
                    route.road_condition,
                  weather_impact:
                    route.weather_impact,
                  availability_percent:
                    route.availability_percent,
                  is_available:
                    route.is_available,
                }),
              )}
            />
          )}

        </div>

        {/* =====================================================
            ROUTE NETWORK
        ====================================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h3>
                Route Network
              </h3>

              <span>
                Synthetic logistics network
                for planning
              </span>

            </div>

            <select
              value={routeFilter}
              onChange={(e) =>
                setRouteFilter(
                  e.target.value,
                )
              }
              style={selectStyle}
            >

              <option value="ALL">
                All Routes
              </option>

              <option value="AVAILABLE">
                Available
              </option>

              <option value="UNAVAILABLE">
                Unavailable
              </option>

              <option value="DISRUPTED">
                Disrupted
              </option>

            </select>

          </div>

          {loading ? (
            <Loading />
          ) : filteredRoutes.length === 0 ? (
            <EmptyState
              icon={
                <MapPinned size={36} />
              }
              title="No routes"
              message="No routes match the selected filter."
            />
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >

              <table style={tableStyle}>

                <thead>

                  <tr>

                    <th style={thStyle}>
                      Route
                    </th>

                    <th style={thStyle}>
                      Network
                    </th>

                    <th style={thStyle}>
                      Distance
                    </th>

                    <th style={thStyle}>
                      ETA
                    </th>

                    <th style={thStyle}>
                      Capacity
                    </th>

                    <th style={thStyle}>
                      Road
                    </th>

                    <th style={thStyle}>
                      Weather
                    </th>

                    <th style={thStyle}>
                      Availability
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredRoutes.map(
                    (route) => (
                      <tr
                        key={route.id}
                      >

                        <td style={tdStyle}>

                          <b>
                            {
                              route.route_code
                            }
                          </b>

                          <div
                            style={{
                              marginTop: 5,
                            }}
                          >

                            <span
                              className={`inventory-status ${routeStatusClass(
                                route,
                              )}`}
                            >

                              {route.is_available
                                ? "AVAILABLE"
                                : "UNAVAILABLE"}

                            </span>

                          </div>

                        </td>

                        <td style={tdStyle}>

                          <b>
                            {
                              route.from_code
                            }
                          </b>

                          <span
                            style={{
                              margin:
                                "0 7px",
                              color:
                                "var(--muted)",
                            }}
                          >
                            →
                          </span>

                          <b>
                            {
                              route.to_code
                            }
                          </b>

                        </td>

                        <td style={tdStyle}>

                          {formatNumber(
                            route.distance_km,
                          )}{" "}
                          km

                        </td>

                        <td style={tdStyle}>

                          {formatNumber(
                            route.estimated_time_hours,
                          )}{" "}
                          hrs

                        </td>

                        <td style={tdStyle}>

                          {formatNumber(
                            route.capacity,
                          )}

                        </td>

                        <td style={tdStyle}>

                          <span
                            className={`inventory-status ${
                              route.road_condition ===
                              "NORMAL"
                                ? "green"
                                : "amber"
                            }`}
                          >

                            {
                              route.road_condition
                            }

                          </span>

                        </td>

                        <td style={tdStyle}>

                          <span
                            className={`inventory-status ${
                              route.weather_impact ===
                              "LOW"
                                ? "green"
                                : "amber"
                            }`}
                          >

                            {
                              route.weather_impact
                            }

                          </span>

                        </td>

                        <td style={tdStyle}>

                          {formatNumber(
                            route.availability_percent,
                          )}
                          %

                        </td>

                      </tr>
                    ),
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* =====================================================
            PLANNING NOTE
        ====================================================== */}

        <div className="human-note">

          <b>
            Planning note:
          </b>{" "}

          Route and transport information is
          presented as a synthetic planning
          network. Distance, travel time,
          capacity, road condition and weather
          impact can be used by downstream
          optimization and scenario modules.

        </div>

      </div>
    </section>
  );
}

/* =========================================================
   LOADING
========================================================= */

function Loading() {
  return (
    <div
      style={{
        padding: "45px 20px",
        textAlign: "center",
        color: "var(--muted)",
      }}
    >
      Loading transport data...
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div
      style={{
        padding: "55px 20px",
        textAlign: "center",
      }}
    >

      <div
        style={{
          opacity: 0.6,
        }}
      >
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p
        style={{
          color: "var(--muted)",
        }}
      >
        {message}
      </p>

    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const selectStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--text)",
  outline: "none",
  fontSize: 12,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 950,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "11px 10px",
  borderBottom: "1px solid var(--line)",
  color: "var(--muted)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: CSSProperties = {
  padding: "13px 10px",
  borderBottom: "1px solid var(--line)",
  fontSize: 13,
  verticalAlign: "top",
};