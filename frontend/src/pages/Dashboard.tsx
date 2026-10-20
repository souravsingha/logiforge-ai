import {

  Area,

  AreaChart,

  Bar,

  BarChart,

  CartesianGrid,

  ResponsiveContainer,

  Tooltip,

  XAxis,

  YAxis,

} from "recharts";



import {

  ArrowUpRight,

  Boxes,

  BrainCircuit,

  CircleAlert,

  GitBranch,

  MapPin,

  ShieldCheck,

  Truck,

} from "lucide-react";



import { useEffect, useMemo, useState } from "react";

import api from "../lib/api";



type Summary = {

  totalLocations: number;

  criticalLocations: number;

  pendingRequests: number;

  activeTransportAssets: number;

  lowInventoryItems: number;

  predictedShortages: number;

  openScenarios: number;

};



type AlertItem = {

  id: string;

  severity: string;

  alert_type: string;

  title: string;

  message: string;

  created_at: string;

};



type InventoryItem = {

  id: string;

  location_code: string;

  item_name: string;

  category: string;

  current_quantity: number;

  daily_average_consumption: number;

  days_of_supply: number;

  status: "GREEN" | "AMBER" | "RED";

};



type Scenario = {

  id: string;

  name: string;

  type: string;

  parameter: number;

  status: string;

  created_at: string;

};



type ForecastItem = {

  forecast_date?: string;

  forecasted_demand?: number | string;

  predicted_demand?: number | string;

  demand?: number | string;

  forecast_value?: number | string;

};



type DashboardOverview = {

  summary: {

    locations: number;

    critical_inventory: number;

    pending_requests: number;

    active_assets: number;

  };

  alerts: AlertItem[];

  requests: unknown[];

  inventory: InventoryItem[];

};



type ForecastPoint = {

  m: string;

  a: number;

  p: number;

};



const fallbackForecast: ForecastPoint[] = [

  { m: "Apr", a: 62, p: 64 },

  { m: "May", a: 66, p: 68 },

  { m: "Jun", a: 70, p: 73 },

  { m: "Jul", a: 75, p: 78 },

  { m: "Aug", a: 79, p: 84 },

  { m: "Sep", a: 83, p: 90 },

];



export default function Dashboard() {

  const [summary, setSummary] =

    useState<Summary | null>(null);



  const [alerts, setAlerts] =

    useState<AlertItem[]>([]);



  const [inventory, setInventory] =

    useState<InventoryItem[]>([]);



  const [scenarios, setScenarios] =

    useState<Scenario[]>([]);



  const [forecast, setForecast] =

    useState<ForecastPoint[]>(fallbackForecast);



  const [loading, setLoading] =

    useState(true);



  const [error, setError] =

    useState("");



  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  useEffect(() => {

    const loadDashboard = async () => {

      try {

        setLoading(true);

        setError("");



        const [

          overviewResponse,

          scenarioResponse,

          forecastResponse,

        ] = await Promise.all([

          api.get<{

            success: boolean;

            data: DashboardOverview;

          }>("/dashboard/overview"),



          api.get<{

            success: boolean;

            data: Scenario[];

          }>("/scenarios"),



          api.get<{

            success: boolean;

            data: ForecastItem[];

          }>("/forecast"),

        ]);



        const data =

          overviewResponse.data.data;



        const scenarioData =

          scenarioResponse.data?.data || [];



        const forecastData =

          forecastResponse.data?.data || [];



        const lowInventoryCount =

          data.inventory.filter(

            (item) =>

              item.status === "AMBER" ||

              item.status === "RED"

          ).length;



        const predictedShortageCount =

          data.alerts.filter(

            (alert) =>

              alert.severity === "CRITICAL" ||

              alert.alert_type

                .toLowerCase()

                .includes("shortage") ||

              alert.alert_type

                .toLowerCase()

                .includes("stockout")

          ).length;



        const openScenarioCount =

          scenarioData.filter(

            (scenario) =>

              scenario.status === "OPEN"

          ).length;



        setSummary({

          totalLocations:

            data.summary.locations,



          criticalLocations:

            data.summary.critical_inventory,



          pendingRequests:

            data.summary.pending_requests,



          activeTransportAssets:

            data.summary.active_assets,



          lowInventoryItems:

            lowInventoryCount,



          predictedShortages:

            predictedShortageCount,



          openScenarios:

            openScenarioCount,

        });



        setAlerts(data.alerts);

        setInventory(data.inventory);

        setScenarios(scenarioData);



        /*

         * Forecast API is optional for the dashboard.

         * If usable forecast values are available,

         * build a compact chart. Otherwise retain

         * the existing synthetic visualization.

         */

        if (forecastData.length > 0) {

          const grouped = new Map<

            string,

            {

              date: string;

              values: number[];

            }

          >();



          forecastData

            .slice(0, 30)

            .forEach((item) => {

              const date =

                item.forecast_date;



              const rawValue =

                item.forecasted_demand ??

                item.predicted_demand ??

                item.demand ??

                item.forecast_value;



              if (!date || rawValue == null) {

                return;

              }



              const value =

                Number(rawValue);



              if (!Number.isFinite(value)) {

                return;

              }



              const key =

                new Date(date)

                  .toISOString()

                  .slice(0, 10);



              const existing =

                grouped.get(key);



              if (existing) {

                existing.values.push(value);

              } else {

                grouped.set(key, {

                  date: key,

                  values: [value],

                });

              }

            });



          const liveForecast =

            Array.from(grouped.values())

              .sort(

                (a, b) =>

                  new Date(a.date).getTime() -

                  new Date(b.date).getTime()

              )

              .slice(-6)

              .map((item) => {

                const average =

                  item.values.reduce(

                    (sum, value) =>

                      sum + value,

                    0

                  ) /

                  item.values.length;



                return {

                  m: new Date(

                    item.date

                  ).toLocaleDateString(

                    "en-US",

                    {

                      month: "short",

                    }

                  ),



                  a: 0,



                  p: Math.round(

                    average

                  ),

                };

              });



          if (liveForecast.length > 0) {

            setForecast(liveForecast);

          }

        }

      } catch (err: any) {

        console.error(

          "Dashboard loading error:",

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

            "Unable to load dashboard data from backend."

        );

      } finally {

        setLoading(false);

      }

    };



    loadDashboard();

  }, []);



  const health = useMemo(() => {

    const categories = [

      "Food",

      "Fuel",

      "Medical",

      "Maintenance",

      "Essentials",

    ];



    return categories.map((category) => {

      const items =

        inventory.filter(

          (item) =>

            item.category.toLowerCase() ===

            category.toLowerCase()

        );



      if (!items.length) {

        return {

          n: category,

          v: 0,

        };

      }



      const score =

        items.reduce(

          (total, item) => {

            if (

              item.status === "GREEN"

            ) {

              return total + 100;

            }



            if (

              item.status === "AMBER"

            ) {

              return total + 65;

            }



            return total + 30;

          },

          0

        ) / items.length;



      return {

        n: category,

        v: Math.round(score),

      };

    });

  }, [inventory]);



  const criticalAlerts = useMemo(() => {

    return alerts.filter(

      (alert) =>

        alert.severity ===

          "CRITICAL" ||

        alert.alert_type

          .toLowerCase()

          .includes("stockout") ||

        alert.alert_type

          .toLowerCase()

          .includes("shortage")

    );

  }, [alerts]);



  const openScenarios = useMemo(() => {

    return scenarios.filter(

      (scenario) =>

        scenario.status === "OPEN"

    );

  }, [scenarios]);



  const operationalState = useMemo(() => {

    if (!summary) {

      return {

        label: "LOADING",

        className: "info",

      };

    }



    if (

      summary.predictedShortages > 0 ||

      summary.criticalLocations > 0

    ) {

      return {

        label: "ATTENTION REQUIRED",

        className: "warning",

      };

    }



    return {

      label: "SYSTEM OPERATIONAL",

      className: "green",

    };

  }, [summary]);



  const stats = [

    [

      "Demo Locations",

      summary?.totalLocations ?? 0,

      MapPin,

    ],

    [

      "Low Inventory",

      summary?.lowInventoryItems ?? 0,

      Boxes,

    ],

    [

      "Predicted Shortages",

      summary?.predictedShortages ?? 0,

      BrainCircuit,

    ],

    [

      "Active Assets",

      summary?.activeTransportAssets ?? 0,

      Truck,

    ],

  ] as const;



  const formatAlertTime = (

    date: string

  ) => {

    const diff =

      Date.now() -

      new Date(date).getTime();



    const minutes = Math.max(

      1,

      Math.floor(diff / 60000)

    );



    if (minutes < 60) {

      return `${minutes}m ago`;

    }



    const hours =

      Math.floor(minutes / 60);



    if (hours < 24) {

      return `${hours}h ago`;

    }



    return `${Math.floor(

      hours / 24

    )}d ago`;

  };



  return (

    <section className="dashboard-page">



      <div className="dashboard-inner">



        {/* HEADER */}

        <div className="dash-head">



          <div>



            <span className="status-pill small">

              <i />



              {operationalState.label}

            </span>



            <h1>

              {greeting}, Planner.

            </h1>



            <p>

              Current logistics intelligence

              snapshot across the synthetic

              network.

            </p>



          </div>



          <div className="demo-badge">

            SYNTHETIC DATA · HUMAN REVIEW

          </div>



        </div>



        {/* ERROR */}

        {error && (

          <div

            style={{

              marginBottom: "16px",

              padding: "12px 14px",

              borderRadius: "10px",

              border:

                "1px solid rgba(239,68,68,.25)",

              background:

                "rgba(239,68,68,.08)",

              color: "#fca5a5",

              fontSize: "13px",

            }}

          >

            {error}

          </div>

        )}



        {/* KPI */}

        <div className="stat-grid">



          {stats.map(

            ([label, value, Icon]) => (

              <div

                className="stat-card"

                key={label}

              >



                <div className="stat-top">



                  <span className="stat-icon">

                    <Icon size={18} />

                  </span>



                </div>



                <b>

                  {loading

                    ? "—"

                    : value}

                </b>



                <small>

                  {label}

                </small>



              </div>

            )

          )}



        </div>



        {/* DEMAND + INVENTORY */}

        <div className="dashboard-grid">



          <div className="panel large">



            <div className="panel-head">



              <div>

                <h2>

                  Demand Forecast

                </h2>



                <p>

                  Current forecast data

                  from the forecasting service

                </p>

              </div>



              <span className="panel-tag">

                FORECAST

              </span>



            </div>



            <div className="chart">



              <ResponsiveContainer>

                <AreaChart

                  data={forecast}

                >



                  <defs>



                    <linearGradient

                      id="forecastFill"

                      x1="0"

                      y1="0"

                      x2="0"

                      y2="1"

                    >



                      <stop

                        offset="0"

                        stopColor="#22d3ee"

                        stopOpacity=".35"

                      />



                      <stop

                        offset="1"

                        stopColor="#22d3ee"

                        stopOpacity="0"

                      />



                    </linearGradient>



                  </defs>



                  <CartesianGrid

                    strokeDasharray="3 3"

                    stroke="rgba(148,163,184,.12)"

                  />



                  <XAxis

                    dataKey="m"

                    axisLine={false}

                    tickLine={false}

                  />



                  <YAxis

                    axisLine={false}

                    tickLine={false}

                  />



                  <Tooltip />



                  <Area

                    type="monotone"

                    dataKey="a"

                    stroke="#64748b"

                    fill="transparent"

                    strokeWidth={2}

                    name="Actual"

                  />



                  <Area

                    type="monotone"

                    dataKey="p"

                    stroke="#22d3ee"

                    fill="url(#forecastFill)"

                    strokeWidth={3}

                    name="Predicted"

                  />



                </AreaChart>

              </ResponsiveContainer>



            </div>



            <div

              style={{

                padding:

                  "0 4px 4px",

                fontSize: "11px",

                opacity: 0.55,

              }}

            >

              Forecast values are

              generated from available

              demand forecast records.

            </div>



          </div>



          <div className="panel">



            <div className="panel-head">



              <div>

                <h2>

                  Inventory Health

                </h2>



                <p>

                  Category readiness

                </p>

              </div>



              <Boxes size={18} />



            </div>



            <div className="chart">



              <ResponsiveContainer>



                <BarChart

                  data={health}

                  layout="vertical"

                >



                  <XAxis

                    type="number"

                    domain={[0, 100]}

                    hide

                  />



                  <YAxis

                    type="category"

                    dataKey="n"

                    width={80}

                    tick={{

                      fontSize: 10,

                    }}

                    axisLine={false}

                    tickLine={false}

                  />



                  <Tooltip />



                  <Bar

                    dataKey="v"

                    fill="#14b8a6"

                    radius={[

                      0,

                      6,

                      6,

                      0,

                    ]}

                    barSize={18}

                  />



                </BarChart>



              </ResponsiveContainer>



            </div>



          </div>



        </div>



        {/* DECISION PIPELINE */}

        <div

          className="panel"

          style={{ marginTop: 14 }}

        >



          <div className="panel-head">



            <div>

              <h2>

                Decision Support Pipeline

              </h2>



              <p>

                Current system workflow

              </p>

            </div>



            <ShieldCheck size={18} />



          </div>



          <div

            style={{

              display: "grid",

              gridTemplateColumns:

                "repeat(5, minmax(0, 1fr))",

              gap: "10px",

            }}

          >



            {[

              {

                number: "01",

                title: "FORECAST",

                description: "Demand prediction",

                Icon: BrainCircuit,

              },

              {

                number: "02",

                title: "RISK",

                description: "Inventory monitoring",

                Icon: Boxes,

              },

              {

                number: "03",

                title: "REQUEST",

                description: "Supply requirements",

                Icon: GitBranch,

              },

              {

                number: "04",

                title: "OPTIMIZE",

                description: "Allocation planning",

                Icon: Truck,

              },

              {

                number: "05",

                title: "SCENARIO",

                description: `${openScenarios.length} open`,

                Icon: ShieldCheck,

              },

            ].map(

              ({

                number,

                title,

                description,

                Icon,

              }) => (

                <div

                  key={title}

                  style={{

                    padding: "14px",

                    border:

                      "1px solid var(--line)",

                    borderRadius: "12px",

                    background:

                      "var(--surface2)",

                    minWidth: 0,

                  }}

                >



                  <div

                    style={{

                      display: "flex",

                      justifyContent:

                        "space-between",

                      alignItems: "center",

                    }}

                  >



                    <span

                      style={{

                        color:

                          "var(--accent)",

                        fontSize: "8px",

                        fontWeight: 800,

                      }}

                    >

                      {number}

                    </span>



                    <Icon

                      size={15}

                      color="var(--accent)"

                    />



                  </div>



                  <strong

                    style={{

                      display: "block",

                      marginTop: "10px",

                      fontSize: "10px",

                    }}

                  >

                    {title}

                  </strong>



                  <span

                    style={{

                      display: "block",

                      marginTop: "4px",

                      color:

                        "var(--muted)",

                      fontSize: "8px",

                    }}

                  >

                    {description}

                  </span>



                </div>

              )

            )}



          </div>



        </div>



        {/* NETWORK + ALERTS */}

        <div

          className="dashboard-grid lower"

          style={{ marginTop: 14 }}

        >



          {/* NETWORK */}

          <div className="panel">



            <div className="panel-head">



              <div>

                <h2>

                  Synthetic Logistics Network

                </h2>



                <p>

                  Decision-support visualization

                  · not operational navigation

                </p>

              </div>



              <MapPin size={18} />



            </div>



            <div className="dashboard-map">



              <div className="grid-bg" />



              <svg viewBox="0 0 700 310">



                <path

                  d="M100 105 C230 80 260 170 350 145 C450 115 500 75 610 110"

                  className="route cyan"

                />



                <path

                  d="M100 105 C210 180 260 235 370 220 C460 205 530 240 610 195"

                  className="route teal"

                />



              </svg>



              {[

                ["A01", "n1"],

                ["D01", "n2"],

                ["A07", "n3"],

                ["A12", "n4"],

                ["D03", "n5"],

              ].map(

                ([name, node]) => (

                  <div

                    className={`dash-node ${node}`}

                    key={name}

                  >

                    <i />

                    <span>

                      {name}

                    </span>

                  </div>

                )

              )}



            </div>



          </div>



          {/* ALERTS */}

          <div className="panel">



            <div className="panel-head">



              <div>

                <h2>

                  Critical Alerts

                </h2>



                <p>

                  Requires planner review

                </p>

              </div>



              <CircleAlert size={18} />



            </div>



            <div className="alerts">



              {loading ? (



                <div

                  style={{

                    padding:

                      "20px 0",

                    opacity: 0.6,

                    fontSize: "13px",

                  }}

                >

                  Loading alerts...

                </div>



              ) : criticalAlerts.length ===

                0 ? (



                <div

                  style={{

                    padding:

                      "20px 0",

                    opacity: 0.6,

                    fontSize: "13px",

                  }}

                >

                  No critical inventory

                  or shortage alerts.

                </div>



              ) : (



                criticalAlerts

                  .slice(0, 6)

                  .map((alert) => (



                    <div

                      className="alert-row"

                      key={alert.id}

                    >



                      <div>



                        <b

                          className={

                            alert.severity.toLowerCase()

                          }

                        >

                          {alert.severity}

                        </b>



                        <strong>

                          {alert.title}

                        </strong>



                      </div>



                      <small>

                        {formatAlertTime(

                          alert.created_at

                        )}

                      </small>



                    </div>



                  ))



              )}



            </div>



          </div>



        </div>



        {/* SCENARIO SNAPSHOT */}

        <div

          className="dashboard-grid"

          style={{ marginTop: 0 }}

        >



          <div className="panel">



            <div className="panel-head">



              <div>

                <h2>

                  Active Scenarios

                </h2>



                <p>

                  Current what-if simulations

                </p>

              </div>



              <GitBranch size={18} />



            </div>



            {openScenarios.length ===

            0 ? (



              <div

                style={{

                  padding:

                    "20px 0",

                  color:

                    "var(--muted)",

                  fontSize: "11px",

                }}

              >

                No open scenarios.

              </div>



            ) : (



              <div

                style={{

                  display: "grid",

                  gap: "9px",

                }}

              >



                {openScenarios

                  .slice(0, 4)

                  .map((scenario) => (



                    <div

                      key={scenario.id}

                      style={{

                        display: "flex",

                        alignItems:

                          "center",

                        justifyContent:

                          "space-between",

                        gap: "10px",

                        padding:

                          "11px 12px",

                        border:

                          "1px solid var(--line)",

                        borderRadius: "10px",

                        background:

                          "var(--surface2)",

                      }}

                    >



                      <div>



                        <strong

                          style={{

                            display:

                              "block",

                            fontSize:

                              "10px",

                          }}

                        >

                          {scenario.name}

                        </strong>



                        <span

                          style={{

                            display:

                              "block",

                            marginTop:

                              "4px",

                            color:

                              "var(--muted)",

                            fontSize:

                              "8px",

                          }}

                        >

                          {scenario.type.replaceAll(

                            "_",

                            " "

                          )}

                        </span>



                      </div>



                      <span className="status-pill small">

                        <i />

                        {scenario.parameter}%

                      </span>



                    </div>



                  ))}



              </div>



            )}



          </div>



          <div className="panel">



            <div className="panel-head">



              <div>

                <h2>

                  Operational Snapshot

                </h2>



                <p>

                  Current planning workload

                </p>

              </div>



              <ShieldCheck size={18} />



            </div>



            <div

              style={{

                display: "grid",

                gap: "10px",

              }}

            >



              {[

                {

                  label: "Pending Supply Requests",

                  value: summary?.pendingRequests ?? 0,

                },

                {

                  label: "Critical Locations",

                  value: summary?.criticalLocations ?? 0,

                },

                {

                  label: "Low Inventory Records",

                  value: summary?.lowInventoryItems ?? 0,

                },

                {

                  label: "Open Scenarios",

                  value: summary?.openScenarios ?? 0,

                },

              ].map(

                ({ label, value }) => (

                  <div

                    key={String(label)}

                    style={{

                      display:

                        "flex",

                      justifyContent:

                        "space-between",

                      alignItems:

                        "center",

                      padding:

                        "10px 12px",

                      borderBottom:

                        "1px solid var(--line)",

                    }}

                  >



                    <span

                      style={{

                        color:

                          "var(--muted)",

                        fontSize:

                          "9px",

                      }}

                    >

                      {label}

                    </span>



                    <strong

                      style={{

                        fontSize:

                          "12px",

                      }}

                    >

                      {value}

                    </strong>



                  </div>

                )

              )}



            </div>



          </div>



        </div>



        {/* HUMAN REVIEW */}

        <div className="human-note">



          <span>

            Human review

          </span>



          LOGIFORGE AI provides

          recommendations and scenario

          analysis; final logistics decisions

          remain with authorized users.



          <ArrowUpRight size={15} />



        </div>



      </div>



    </section>

  );

}