import { useState } from "react";
import {
  BrainCircuit,
  Send,
  User,
  Bot,
  Loader2,
  Sparkles,
  MapPin,
  Package,
  CalendarDays,
  AlertTriangle,
  ShieldAlert,
  Truck,
  Route,
  TrendingUp,
  Clock3,
  CheckCircle2,
  Zap,
} from "lucide-react";
import api from "../lib/api";

type MessageRole = "user" | "assistant";

type InventoryRecord = {
  location: string;
  location_name?: string;
  item_code?: string;
  item: string;
  current_quantity?: number;
  days_of_supply?: number;
  status: "RED" | "AMBER" | "GREEN" | string;
};

type SupplyRequest = {
  id?: string;
  request_code: string;
  quantity: number;
  priority: string;
  status: string;
  required_by?: string;
  reason?: string;
  destination: string;
  destination_name?: string;
  item_code?: string;
  item: string;
};

type AlertRecord = {
  severity: string;
  title: string;
  message: string;
  created_at?: string;
};

type ForecastRecord = {
  forecast_date: string;
  location: string;
  item: string;
  predicted_quantity: number;
  model_name?: string;
};

type TransportAsset = {
  vehicle_code: string;
  asset_type?: string;
  capacity?: number;
  capacity_unit?: string;
  status: string;
  availability_percent?: number;
};

type TransportRoute = {
  route_code: string;
  from_code: string;
  to_code: string;
  distance_km?: number;
  estimated_time_hours?: number;
  capacity?: number;
  road_condition?: string;
  weather_impact?: string;
  availability_percent?: number;
  is_available: boolean;
};

type OptimizationRun = {
  id?: string;
  runType?: string;
  status?: string;
  solverName?: string;
  inputSummary?: unknown;
  outputSummary?: unknown;
  createdAt?: string;
};

type AssistantData = {
  question: string;
  intent: string;
  answer: string;

  records?: InventoryRecord[] | SupplyRequest[] | AlertRecord[] | ForecastRecord[];

  summary?: {
    total?: number;
    critical?: number;
    high?: number;
    medium?: number;
    totalAssets?: number;
    availableAssets?: number;
    totalRoutes?: number;
    availableRoutes?: number;
    averageAssetAvailability?: number;
  };

  assets?: TransportAsset[];
  routes?: TransportRoute[];

  run?: OptimizationRun | null;

  inventoryRisks?: InventoryRecord[];
  pendingRequests?: number;
  alerts?: AlertRecord[];
};

type Message = {
  role: MessageRole;
  content: string;
  data?: AssistantData;
};

const suggestions = [
  "Which locations have critical stock risk?",
  "Show pending critical supply requests.",
  "What is the current transport availability?",
  "Which items are predicted to run out?",
  "Explain the latest optimization recommendation.",
];

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "LOGIFORGE AI Assistant is ready. Ask about inventory, forecasts, alerts, supply requests, transport, optimization, or scenarios.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const askAssistant = async (question?: string) => {
    const text = (question ?? input).trim();

    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/assistant/query", {
        question: text,
      });

      const data: AssistantData =
        response.data?.data || response.data || {};

      const answer =
        data.answer ||
        response.data?.message ||
        "No response was returned.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
          data,
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Assistant request failed. Please check the backend assistant API.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderInventoryRecords = (records: InventoryRecord[]) => {
    if (!records?.length) return null;

    return (
      <div
        style={{
          display: "grid",
          gap: "12px",
          marginTop: "14px",
        }}
      >
        {records.map((record, index) => {
          const isRed = record.status === "RED";

          return (
            <div
              key={`${record.location}-${record.item_code}-${index}`}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "14px",
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              {/* CARD HEADER */}
              <div
                style={{
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--surface2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      background: isRed
                        ? "rgba(239,68,68,.12)"
                        : "rgba(245,158,11,.12)",
                      color: isRed ? "#ef4444" : "#f59e0b",
                    }}
                  >
                    {isRed ? (
                      <ShieldAlert size={17} />
                    ) : (
                      <AlertTriangle size={17} />
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        color: "var(--muted)",
                        marginBottom: "3px",
                      }}
                    >
                      INVENTORY RISK
                    </div>

                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                      }}
                    >
                      {record.item}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 800,
                    background: isRed
                      ? "rgba(239,68,68,.12)"
                      : "rgba(245,158,11,.12)",
                    color: isRed ? "#ef4444" : "#f59e0b",
                  }}
                >
                  {record.status}
                </span>
              </div>

              {/* CARD BODY */}
              <div
                style={{
                  padding: "14px",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "10px",
                }}
              >
                <InfoBox
                  icon={<MapPin size={15} />}
                  label="Location"
                  value={
                    record.location_name
                      ? `${record.location} — ${record.location_name}`
                      : record.location
                  }
                />

                <InfoBox
                  icon={<Package size={15} />}
                  label="Item"
                  value={record.item}
                />

                <InfoBox
                  icon={<Package size={15} />}
                  label="Current Quantity"
                  value={
                    record.current_quantity !== undefined
                      ? Number(record.current_quantity).toLocaleString()
                      : "—"
                  }
                />

                <InfoBox
                  icon={<Clock3 size={15} />}
                  label="Days of Supply"
                  value={
                    record.days_of_supply !== undefined
                      ? `${Number(record.days_of_supply).toFixed(1)} days`
                      : "—"
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSupplyRequests = (records: SupplyRequest[]) => {
    if (!records?.length) return null;

    return (
      <div
        style={{
          display: "grid",
          gap: "12px",
          marginTop: "14px",
        }}
      >
        {records.map((request, index) => (
          <div
            key={`${request.request_code}-${index}`}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "14px",
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface2)",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div className="avatar">
                  <Package size={17} />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      fontWeight: 700,
                      letterSpacing: "1px",
                    }}
                  >
                    SUPPLY REQUEST
                  </div>

                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      marginTop: "3px",
                    }}
                  >
                    {request.request_code}
                  </div>
                </div>
              </div>

              <span
                style={{
                  padding: "6px 11px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  background:
                    request.priority === "CRITICAL"
                      ? "rgba(239,68,68,.12)"
                      : request.priority === "HIGH"
                      ? "rgba(245,158,11,.12)"
                      : "rgba(59,130,246,.12)",
                  color:
                    request.priority === "CRITICAL"
                      ? "#ef4444"
                      : request.priority === "HIGH"
                      ? "#f59e0b"
                      : "#3b82f6",
                }}
              >
                {request.priority}
              </span>
            </div>

            <div
              style={{
                padding: "14px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "10px",
              }}
            >
              <InfoBox
                icon={<MapPin size={15} />}
                label="Location"
                value={
                  request.destination_name
                    ? `${request.destination} — ${request.destination_name}`
                    : request.destination
                }
              />

              <InfoBox
                icon={<Package size={15} />}
                label="Item"
                value={request.item}
              />

              <InfoBox
                icon={<TrendingUp size={15} />}
                label="Quantity"
                value={Number(request.quantity).toLocaleString()}
              />

              <InfoBox
                icon={<CheckCircle2 size={15} />}
                label="Status"
                value={request.status}
              />

              <InfoBox
                icon={<CalendarDays size={15} />}
                label="Required By"
                value={
                  request.required_by
                    ? formatDate(request.required_by)
                    : "Not specified"
                }
              />

              {request.reason && (
                <InfoBox
                  icon={<AlertTriangle size={15} />}
                  label="Reason"
                  value={request.reason}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAlerts = (records: AlertRecord[]) => {
    if (!records?.length) return null;

    return (
      <div
        style={{
          display: "grid",
          gap: "10px",
          marginTop: "14px",
        }}
      >
        {records.map((alert, index) => {
          const critical = alert.severity === "CRITICAL";

          return (
            <div
              key={`${alert.title}-${index}`}
              style={{
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <div className="avatar">
                  <AlertTriangle size={16} />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{alert.title}</strong>

                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: critical ? "#ef4444" : "#f59e0b",
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      color: "var(--muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {alert.message}
                  </div>

                  {alert.created_at && (
                    <div
                      style={{
                        marginTop: "7px",
                        fontSize: "11px",
                        color: "var(--muted)",
                      }}
                    >
                      {formatDate(alert.created_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderForecasts = (records: ForecastRecord[]) => {
    if (!records?.length) return null;

    return (
      <div
        style={{
          marginTop: "14px",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "12px",
            overflow: "hidden",
            minWidth: "500px",
          }}
        >
          {records.map((forecast, index) => (
            <div
              key={`${forecast.forecast_date}-${forecast.item}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
                gap: "10px",
                padding: "12px 14px",
                borderBottom:
                  index === records.length - 1
                    ? "none"
                    : "1px solid var(--line)",
                background:
                  index % 2 === 0
                    ? "var(--surface)"
                    : "var(--surface2)",
              }}
            >
              <span>{formatDate(forecast.forecast_date)}</span>
              <span>{forecast.location}</span>
              <span>{forecast.item}</span>
              <strong>
                {Number(
                  forecast.predicted_quantity
                ).toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTransport = (data: AssistantData) => {
    if (!data.summary) return null;

    return (
      <div
        style={{
          marginTop: "14px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
          }}
        >
          <InfoBox
            icon={<Truck size={15} />}
            label="Available Assets"
            value={`${data.summary.availableAssets ?? 0} / ${
              data.summary.totalAssets ?? 0
            }`}
          />

          <InfoBox
            icon={<Route size={15} />}
            label="Available Routes"
            value={`${data.summary.availableRoutes ?? 0} / ${
              data.summary.totalRoutes ?? 0
            }`}
          />

          <InfoBox
            icon={<TrendingUp size={15} />}
            label="Asset Availability"
            value={`${data.summary.averageAssetAvailability ?? 0}%`}
          />
        </div>
      </div>
    );
  };

  const renderOptimization = (run?: OptimizationRun | null) => {
    if (!run) return null;

    return (
      <div
        style={{
          marginTop: "14px",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div className="avatar">
            <Zap size={17} />
          </div>

          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              Latest Optimization Run
            </div>

            <div
              style={{
                marginTop: "4px",
                color: "var(--muted)",
                fontSize: "13px",
              }}
            >
              {run.runType || "Optimization"} ·{" "}
              {run.status || "UNKNOWN"}
            </div>
          </div>
        </div>

        {run.solverName && (
          <div
            style={{
              marginTop: "12px",
              color: "var(--muted)",
              fontSize: "13px",
            }}
          >
            Solver:{" "}
            <strong style={{ color: "var(--text)" }}>
              {run.solverName}
            </strong>
          </div>
        )}

        {run.createdAt && (
          <div
            style={{
              marginTop: "6px",
              color: "var(--muted)",
              fontSize: "12px",
            }}
          >
            Created: {formatDate(run.createdAt)}
          </div>
        )}
      </div>
    );
  };

  const renderStructuredData = (data?: AssistantData) => {
    if (!data) return null;

    switch (data.intent) {
      case "INVENTORY_RISK":
        return renderInventoryRecords(
          (data.records as InventoryRecord[]) || []
        );

      case "SUPPLY_REQUESTS":
        return renderSupplyRequests(
          (data.records as SupplyRequest[]) || []
        );

      case "ALERTS":
        return renderAlerts(
          (data.records as AlertRecord[]) || []
        );

      case "FORECAST":
        return renderForecasts(
          (data.records as ForecastRecord[]) || []
        );

      case "TRANSPORT":
        return renderTransport(data);

      case "OPTIMIZATION":
        return renderOptimization(data.run);

      default:
        return null;
    }
  };

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <div className="eyebrow">INTELLIGENCE</div>

          <h1>AI Assistant</h1>

          <p>
            Natural-language decision support for LOGIFORGE
            operations.
          </p>
        </div>

        <div className="status-badge success">
          <Sparkles size={14} />
          Decision Support
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        className="content-grid"
        style={{
          gridTemplateColumns:
            "minmax(0, 1fr) 280px",
          alignItems: "stretch",
        }}
      >
        {/* CHAT */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Command Assistant</h3>

              <span>
                Ask questions using operational system data
              </span>
            </div>

            <BrainCircuit size={20} />
          </div>

          {/* MESSAGES */}
          <div
            style={{
              minHeight: "420px",
              maxHeight: "620px",
              overflowY: "auto",
              padding: "20px",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: "22px",
                  justifyContent:
                    message.role === "user"
                      ? "flex-end"
                      : "flex-start",
                  alignItems: "flex-start",
                }}
              >
                {/* BOT ICON */}
                {message.role === "assistant" && (
                  <div className="avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth:
                      message.data &&
                      message.data.intent !== "SYSTEM_SUMMARY"
                        ? "92%"
                        : "78%",
                    minWidth:
                      message.data &&
                      message.data.intent !== "SYSTEM_SUMMARY"
                        ? "60%"
                        : undefined,
                  }}
                >
                  {/* TEXT */}
                  <div
                    style={{
                      padding: "12px 15px",
                      borderRadius: "10px",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      background:
                        message.role === "user"
                          ? "var(--accent)"
                          : "var(--surface2)",
                      color:
                        message.role === "user"
                          ? "#ffffff"
                          : "var(--text)",
                    }}
                  >
                    {message.content}
                  </div>

                  {/* STRUCTURED DATA */}
                  {message.role === "assistant" &&
                    renderStructuredData(message.data)}
                </div>

                {/* USER ICON */}
                {message.role === "user" && (
                  <div className="avatar">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* LOADING */}
            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "var(--muted)",
                  padding: "8px",
                }}
              >
                <Loader2
                  size={16}
                  className="spin"
                />

                LOGIFORGE is analyzing operational data...
              </div>
            )}
          </div>

          {/* INPUT */}
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              gap: "10px",
            }}
          >
            <input
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  askAssistant();
                }
              }}
              placeholder="Ask about inventory, forecasts, requests..."
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--surface2)",
                color: "var(--text)",
                outline: "none",
              }}
            />

            <button
              className="primary-btn"
              onClick={() => askAssistant()}
              disabled={
                loading || !input.trim()
              }
            >
              {loading ? (
                <Loader2
                  size={16}
                  className="spin"
                />
              ) : (
                <Send size={16} />
              )}

              Ask
            </button>
          </div>
        </section>

        {/* SUGGESTIONS */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Suggested Queries</h3>

              <span>
                Operational intelligence
              </span>
            </div>
          </div>

          <div style={{ padding: "16px" }}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() =>
                  askAssistant(suggestion)
                }
                disabled={loading}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  border:
                    "1px solid var(--line)",
                  background:
                    "var(--surface2)",
                  color: "var(--text)",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   REUSABLE INFO BOX
========================================================= */

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "10px",
        background: "var(--surface2)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          color: "var(--muted)",
          fontSize: "12px",
          marginBottom: "6px",
        }}
      >
        {icon}
        {label}
      </div>

      <div
        style={{
          fontWeight: 650,
          fontSize: "14px",
          lineHeight: 1.45,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}