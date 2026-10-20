import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  Settings as SettingsIcon,
  RefreshCw,
  Bell,
  ShieldAlert,
  BrainCircuit,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import api from "../lib/api";

type SettingsState = {
  criticalStockDays: number;
  warningStockDays: number;
  autoRefreshEnabled: boolean;
  refreshIntervalSeconds: number;
  operationalNotifications: boolean;
  criticalNotifications: boolean;
  aiDecisionSupport: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  criticalStockDays: 3,
  warningStockDays: 7,
  autoRefreshEnabled: true,
  refreshIntervalSeconds: 30,
  operationalNotifications: true,
  criticalNotifications: true,
  aiDecisionSupport: true,
};

function normalizeSettings(data: any): SettingsState {
  return {
    criticalStockDays:
      Number(data?.criticalStockDays ?? DEFAULT_SETTINGS.criticalStockDays),

    warningStockDays:
      Number(data?.warningStockDays ?? DEFAULT_SETTINGS.warningStockDays),

    autoRefreshEnabled:
      Boolean(
        data?.autoRefreshEnabled ??
          DEFAULT_SETTINGS.autoRefreshEnabled
      ),

    refreshIntervalSeconds:
      Number(
        data?.refreshIntervalSeconds ??
          DEFAULT_SETTINGS.refreshIntervalSeconds
      ),

    operationalNotifications:
      Boolean(
        data?.operationalNotifications ??
          DEFAULT_SETTINGS.operationalNotifications
      ),

    criticalNotifications:
      Boolean(
        data?.criticalNotifications ??
          DEFAULT_SETTINGS.criticalNotifications
      ),

    aiDecisionSupport:
      Boolean(
        data?.aiDecisionSupport ??
          DEFAULT_SETTINGS.aiDecisionSupport
      ),
  };
}

export default function Settings() {
  const [settings, setSettings] =
    useState<SettingsState>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setSaved(false);

      const response = await api.get("/settings");

      const data = response.data?.data;

      if (data) {
        setSettings(normalizeSettings(data));
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load system settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
    setError("");
  }

  function validateSettings() {
    if (settings.criticalStockDays < 1) {
      return "Critical stock threshold must be at least 1 day.";
    }

    if (settings.warningStockDays <= settings.criticalStockDays) {
      return "Warning threshold must be greater than the critical threshold.";
    }

    if (settings.warningStockDays > 365) {
      return "Warning threshold cannot exceed 365 days.";
    }

    if (
      settings.refreshIntervalSeconds < 10 ||
      settings.refreshIntervalSeconds > 3600
    ) {
      return "Refresh interval must be between 10 and 3600 seconds.";
    }

    return "";
  }

  async function saveSettings() {
    const validationError = validateSettings();

    if (validationError) {
      setError(validationError);
      setSaved(false);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaved(false);

      const response = await api.put("/settings", {
        criticalStockDays: settings.criticalStockDays,
        warningStockDays: settings.warningStockDays,
        autoRefreshEnabled: settings.autoRefreshEnabled,
        refreshIntervalSeconds: settings.refreshIntervalSeconds,
        operationalNotifications:
          settings.operationalNotifications,
        criticalNotifications:
          settings.criticalNotifications,
        aiDecisionSupport: settings.aiDecisionSupport,
      });

      const data = response.data?.data;

      if (data) {
        setSettings(normalizeSettings(data));
      }

      setSaved(true);
    } catch (err: any) {
      console.error("Failed to save settings:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    try {
      setResetting(true);
      setError("");
      setSaved(false);

      const response = await api.post("/settings/reset");

      const data = response.data?.data;

      if (data) {
        setSettings(normalizeSettings(data));
      } else {
        setSettings(DEFAULT_SETTINGS);
      }

      setSaved(true);
    } catch (err: any) {
      console.error("Failed to reset settings:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to reset settings."
      );
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--muted)",
            }}
          >
            <Loader2
              size={20}
              style={{
                animation: "spin 1s linear infinite",
              }}
            />

            Loading system settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <div className="eyebrow">
            SYSTEM CONFIGURATION
          </div>

          <h1>Settings</h1>

          <p>
            Configure operational thresholds, refresh behavior,
            notifications and AI decision-support preferences.
          </p>
        </div>

        <div className="status-badge success">
          <SettingsIcon size={14} />

          System Settings
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(239,68,68,.3)",
            background: "rgba(239,68,68,.08)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertTriangle size={18} />

          <span>{error}</span>
        </div>
      )}

      {/* MAIN GRID */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1fr) minmax(280px, 360px)",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* OPERATIONS */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Operations</h3>

                <span>
                  Configure automatic data refresh behavior.
                </span>
              </div>

              <RefreshCw size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <SettingRow
                icon={<RefreshCw size={18} />}
                title="Automatic data refresh"
                description="Keep operational dashboards synchronized automatically."
                enabled={settings.autoRefreshEnabled}
                onChange={(value) =>
                  updateSetting(
                    "autoRefreshEnabled",
                    value
                  )
                }
              />

              <div
                style={{
                  paddingTop: "20px",
                  marginTop: "4px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Refresh interval
                </label>

                <select
                  value={settings.refreshIntervalSeconds}
                  disabled={!settings.autoRefreshEnabled}
                  onChange={(event) =>
                    updateSetting(
                      "refreshIntervalSeconds",
                      Number(event.target.value)
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    outline: "none",
                    opacity: settings.autoRefreshEnabled
                      ? 1
                      : 0.5,
                  }}
                >
                  <option value={15}>
                    Every 15 seconds
                  </option>

                  <option value={30}>
                    Every 30 seconds
                  </option>

                  <option value={60}>
                    Every 1 minute
                  </option>

                  <option value={300}>
                    Every 5 minutes
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* NOTIFICATIONS */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Notifications</h3>

                <span>
                  Control operational and critical alerts.
                </span>
              </div>

              <Bell size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <SettingRow
                icon={<Bell size={18} />}
                title="Operational notifications"
                description="Receive notifications for important logistics events."
                enabled={
                  settings.operationalNotifications
                }
                onChange={(value) =>
                  updateSetting(
                    "operationalNotifications",
                    value
                  )
                }
              />

              <SettingRow
                icon={<ShieldAlert size={18} />}
                title="Critical notifications"
                description="Always surface critical inventory and operational risks."
                enabled={
                  settings.criticalNotifications
                }
                onChange={(value) =>
                  updateSetting(
                    "criticalNotifications",
                    value
                  )
                }
              />
            </div>
          </section>

          {/* AI DECISION SUPPORT */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>AI Decision Support</h3>

                <span>
                  Configure LOGIFORGE intelligence features.
                </span>
              </div>

              <BrainCircuit size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <SettingRow
                icon={<BrainCircuit size={18} />}
                title="AI decision support"
                description="Allow LOGIFORGE AI to analyze operational system data and provide recommendations."
                enabled={
                  settings.aiDecisionSupport
                }
                onChange={(value) =>
                  updateSetting(
                    "aiDecisionSupport",
                    value
                  )
                }
              />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* RISK THRESHOLDS */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Risk Thresholds</h3>

                <span>
                  Inventory days-of-supply configuration.
                </span>
              </div>

              <ShieldAlert size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              {/* CRITICAL */}

              <div style={{ marginBottom: "22px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Critical stock threshold
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={364}
                    value={settings.criticalStockDays}
                    onChange={(event) =>
                      updateSetting(
                        "criticalStockDays",
                        Number(event.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--surface2)",
                      color: "var(--text)",
                      outline: "none",
                    }}
                  />

                  <span
                    style={{
                      color: "var(--muted)",
                    }}
                  >
                    days
                  </span>
                </div>

                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Inventory below this level is treated as
                  critical.
                </p>
              </div>

              {/* WARNING */}

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Warning stock threshold
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="number"
                    min={2}
                    max={365}
                    value={settings.warningStockDays}
                    onChange={(event) =>
                      updateSetting(
                        "warningStockDays",
                        Number(event.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "var(--surface2)",
                      color: "var(--text)",
                      outline: "none",
                    }}
                  />

                  <span
                    style={{
                      color: "var(--muted)",
                    }}
                  >
                    days
                  </span>
                </div>

                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Inventory below this level generates a
                  warning.
                </p>
              </div>
            </div>
          </section>

          {/* CURRENT CONFIGURATION */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Current Configuration</h3>

                <span>
                  Active system configuration.
                </span>
              </div>

              <CheckCircle2 size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <ConfigItem
                label="Auto refresh"
                value={
                  settings.autoRefreshEnabled
                    ? "Enabled"
                    : "Disabled"
                }
              />

              <ConfigItem
                label="Refresh interval"
                value={`${settings.refreshIntervalSeconds} seconds`}
              />

              <ConfigItem
                label="Operational notifications"
                value={
                  settings.operationalNotifications
                    ? "Enabled"
                    : "Disabled"
                }
              />

              <ConfigItem
                label="Critical notifications"
                value={
                  settings.criticalNotifications
                    ? "Enabled"
                    : "Disabled"
                }
              />

              <ConfigItem
                label="AI decision support"
                value={
                  settings.aiDecisionSupport
                    ? "Enabled"
                    : "Disabled"
                }
              />

              <ConfigItem
                label="Critical threshold"
                value={`${settings.criticalStockDays} days`}
              />

              <ConfigItem
                label="Warning threshold"
                value={`${settings.warningStockDays} days`}
              />
            </div>
          </section>
        </div>
      </div>

      {/* ACTION BAR */}

      <div
        style={{
          marginTop: "20px",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: saved
              ? "var(--accent)"
              : "var(--muted)",
          }}
        >
          {saved && <CheckCircle2 size={18} />}

          <span>
            {saved
              ? "Settings updated successfully."
              : "Changes are applied when you click Save Settings."}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            disabled={resetting || saving}
            onClick={resetSettings}
            style={{
              opacity:
                resetting || saving ? 0.6 : 1,
            }}
          >
            {resetting ? (
              <Loader2
                size={16}
                style={{
                  animation:
                    "spin 1s linear infinite",
                }}
              />
            ) : (
              <RotateCcw size={16} />
            )}

            {resetting ? "Resetting..." : "Reset Defaults"}
          </button>

          <button
            type="button"
            className="primary-btn"
            disabled={saving || resetting}
            onClick={saveSettings}
            style={{
              opacity:
                saving || resetting ? 0.6 : 1,
            }}
          >
            {saving ? (
              <Loader2
                size={16}
                style={{
                  animation:
                    "spin 1s linear infinite",
                }}
              />
            ) : (
              <Save size={16} />
            )}

            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SETTING ROW
========================================================= */

type SettingRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

function SettingRow({
  icon,
  title,
  description,
  enabled,
  onChange,
}: SettingRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "16px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface2)",
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "var(--muted)",
              fontSize: "13px",
              lineHeight: 1.5,
              maxWidth: "600px",
            }}
          >
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-label={title}
        aria-pressed={enabled}
        style={{
          width: "48px",
          height: "26px",
          borderRadius: "999px",
          border: "none",
          padding: "3px",
          background: enabled
            ? "var(--accent)"
            : "var(--line)",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.2s ease",
        }}
      >
        <span
          style={{
            display: "block",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#ffffff",
            transform: enabled
              ? "translateX(22px)"
              : "translateX(0)",
            transition:
              "transform 0.2s ease",
          }}
        />
      </button>
    </div>
  );
}

/* =========================================================
   CONFIG ITEM
========================================================= */

type ConfigItemProps = {
  label: string;
  value: string;
};

function ConfigItem({
  label,
  value,
}: ConfigItemProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        padding: "12px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontSize: "13px",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          fontSize: "13px",
          textAlign: "right",
        }}
      >
        {value}
      </strong>
    </div>
  );
}