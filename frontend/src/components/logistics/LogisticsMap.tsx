import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

type MapLocation = {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
};

type MapRoute = {
  id: string;
  route_code: string;
  from_code: string;
  to_code: string;
  distance_km: number | string;
  estimated_time_hours: number | string;
  road_condition: string;
  weather_impact: string;
  availability_percent: number | string;
  is_available: boolean;
};

type LogisticsMapProps = {
  locations: MapLocation[];
  routes: MapRoute[];
};

/*
 * react-leaflet typings in the current project are not exposing
 * some standard Leaflet props correctly.
 *
 * The components themselves still support these props at runtime,
 * so we keep the Leaflet components and use typed aliases here.
 */
const LeafletMapContainer = MapContainer as any;
const LeafletTileLayer = TileLayer as any;
const LeafletPolyline = Polyline as any;
const LeafletTooltip = Tooltip as any;
const LeafletPopup = Popup as any;
const LeafletCircleMarker = CircleMarker as any;

const statusColor = (route: MapRoute) => {
  if (!route.is_available) {
    return "#ef4444";
  }

  if (
    route.road_condition !== "NORMAL" ||
    route.weather_impact !== "LOW"
  ) {
    return "#f59e0b";
  }

  return "#14b8a6";
};

export default function LogisticsMap({
  locations,
  routes,
}: LogisticsMapProps) {
  const locationMap = new Map(
    locations.map((location) => [
      location.code,
      location,
    ]),
  );

  const validRoutes = routes.filter(
    (route) =>
      locationMap.has(route.from_code) &&
      locationMap.has(route.to_code),
  );

  const center: [number, number] =
    locations.length > 0
      ? [
          locations[0].lat,
          locations[0].lng,
        ]
      : [22.5, 87.3];

  return (
    <div
      style={{
        width: "100%",
        height: 520,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--line)",
        position: "relative",
      }}
    >
      <LeafletMapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <LeafletTileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* =====================================================
            ROUTES
        ====================================================== */}

        {validRoutes.map((route) => {
          const from = locationMap.get(
            route.from_code,
          );

          const to = locationMap.get(
            route.to_code,
          );

          if (!from || !to) {
            return null;
          }

          const routeColor =
            statusColor(route);

          return (
            <LeafletPolyline
              key={route.id}
              positions={[
                [from.lat, from.lng],
                [to.lat, to.lng],
              ]}
              pathOptions={{
                color: routeColor,
                weight: 4,
                opacity: route.is_available
                  ? 0.85
                  : 0.55,
                dashArray: route.is_available
                  ? undefined
                  : "8 8",
              }}
            >
              <LeafletTooltip sticky>
                <strong>
                  {route.route_code}
                </strong>

                <br />

                {route.from_code} →{" "}
                {route.to_code}
              </LeafletTooltip>

              <LeafletPopup>
                <div
                  style={{
                    minWidth: 220,
                  }}
                >
                  <strong>
                    {route.route_code}
                  </strong>

                  <div
                    style={{
                      marginTop: 8,
                    }}
                  >
                    <b>Network:</b>{" "}
                    {route.from_code} →{" "}
                    {route.to_code}
                  </div>

                  <div>
                    <b>Distance:</b>{" "}
                    {Number(
                      route.distance_km,
                    ).toFixed(1)}{" "}
                    km
                  </div>

                  <div>
                    <b>ETA:</b>{" "}
                    {Number(
                      route.estimated_time_hours,
                    ).toFixed(1)}{" "}
                    hrs
                  </div>

                  <div>
                    <b>Availability:</b>{" "}
                    {Number(
                      route.availability_percent,
                    ).toFixed(0)}
                    %
                  </div>

                  <div>
                    <b>Road:</b>{" "}
                    {route.road_condition}
                  </div>

                  <div>
                    <b>Weather:</b>{" "}
                    {route.weather_impact}
                  </div>

                  <div>
                    <b>Status:</b>{" "}
                    {route.is_available
                      ? "AVAILABLE"
                      : "UNAVAILABLE"}
                  </div>
                </div>
              </LeafletPopup>
            </LeafletPolyline>
          );
        })}

        {/* =====================================================
            LOCATIONS
        ====================================================== */}

        {locations.map((location) => (
          <LeafletCircleMarker
            key={location.id}
            center={[
              location.lat,
              location.lng,
            ]}
            radius={8}
            pathOptions={{
              color: "#0f172a",
              weight: 2,
              fillColor: "#14b8a6",
              fillOpacity: 1,
            }}
          >
            <LeafletTooltip
              direction="top"
              offset={[0, -8]}
            >
              <strong>
                {location.code}
              </strong>

              <br />

              {location.name}
            </LeafletTooltip>

            <LeafletPopup>
              <strong>
                {location.code}
              </strong>

              <br />

              {location.name}

              <br />

              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                Synthetic planning location
              </span>
            </LeafletPopup>
          </LeafletCircleMarker>
        ))}
      </LeafletMapContainer>

      {/* =====================================================
          LEGEND
      ====================================================== */}

      <div
        style={{
          position: "absolute",
          right: 14,
          bottom: 14,
          zIndex: 1000,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 11,
          boxShadow:
            "0 4px 16px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 7,
          }}
        >
          Route Status
        </div>

        <LegendItem
          color="#14b8a6"
          label="Available"
        />

        <LegendItem
          color="#f59e0b"
          label="Affected"
        />

        <LegendItem
          color="#ef4444"
          label="Unavailable"
        />
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND ITEM
========================================================= */

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginTop: 5,
      }}
    >
      <span
        style={{
          width: 22,
          height: 4,
          borderRadius: 4,
          background: color,
          display: "inline-block",
        }}
      />

      <span>
        {label}
      </span>
    </div>
  );
}