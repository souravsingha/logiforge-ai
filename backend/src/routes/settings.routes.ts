import { Router } from "express";
import pool from "../config/database.js";

const router = Router();

/* -------------------------------------------------
   Types
------------------------------------------------- */

type SettingsRow = {
  id: number;
  critical_stock_days: number;
  warning_stock_days: number;
  auto_refresh_enabled: boolean;
  refresh_interval_seconds: number;
  operational_notifications: boolean;
  critical_notifications: boolean;
  ai_decision_support: boolean;
  updated_at: Date;
};

/* -------------------------------------------------
   Ensure Settings Table
------------------------------------------------- */

const ensureSettingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY,
      critical_stock_days INTEGER NOT NULL DEFAULT 3,
      warning_stock_days INTEGER NOT NULL DEFAULT 7,
      auto_refresh_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      refresh_interval_seconds INTEGER NOT NULL DEFAULT 60,
      operational_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      critical_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      ai_decision_support BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    INSERT INTO system_settings (
      id,
      critical_stock_days,
      warning_stock_days,
      auto_refresh_enabled,
      refresh_interval_seconds,
      operational_notifications,
      critical_notifications,
      ai_decision_support
    )
    VALUES (1, 3, 7, TRUE, 60, TRUE, TRUE, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);
};

/* -------------------------------------------------
   GET SETTINGS
   GET /api/settings
------------------------------------------------- */

router.get("/", async (_req, res) => {
  try {
    await ensureSettingsTable();

    const result = await pool.query<SettingsRow>(`
      SELECT
        id,
        critical_stock_days,
        warning_stock_days,
        auto_refresh_enabled,
        refresh_interval_seconds,
        operational_notifications,
        critical_notifications,
        ai_decision_support,
        updated_at
      FROM system_settings
      WHERE id = 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    const settings = result.rows[0];

    return res.json({
      success: true,
      data: {
        criticalStockDays: settings.critical_stock_days,
        warningStockDays: settings.warning_stock_days,
        autoRefreshEnabled: settings.auto_refresh_enabled,
        refreshIntervalSeconds:
          settings.refresh_interval_seconds,
        operationalNotifications:
          settings.operational_notifications,
        criticalNotifications:
          settings.critical_notifications,
        aiDecisionSupport:
          settings.ai_decision_support,
        updatedAt: settings.updated_at,
      },
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load system settings",
    });
  }
});

/* -------------------------------------------------
   UPDATE SETTINGS
   PUT /api/settings
------------------------------------------------- */

router.put("/", async (req, res) => {
  try {
    await ensureSettingsTable();

    const {
      criticalStockDays,
      warningStockDays,
      autoRefreshEnabled,
      refreshIntervalSeconds,
      operationalNotifications,
      criticalNotifications,
      aiDecisionSupport,
    } = req.body;

    /* ---------------------------------------------
       Validation
    --------------------------------------------- */

    if (
      !Number.isInteger(criticalStockDays) ||
      criticalStockDays < 1 ||
      criticalStockDays > 365
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Critical stock threshold must be an integer between 1 and 365 days.",
      });
    }

    if (
      !Number.isInteger(warningStockDays) ||
      warningStockDays < 1 ||
      warningStockDays > 365
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Warning stock threshold must be an integer between 1 and 365 days.",
      });
    }

    if (criticalStockDays >= warningStockDays) {
      return res.status(400).json({
        success: false,
        message:
          "Critical stock threshold must be lower than warning stock threshold.",
      });
    }

    if (
      !Number.isInteger(refreshIntervalSeconds) ||
      refreshIntervalSeconds < 10 ||
      refreshIntervalSeconds > 3600
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Refresh interval must be between 10 and 3600 seconds.",
      });
    }

    if (typeof autoRefreshEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "autoRefreshEnabled must be boolean.",
      });
    }

    if (typeof operationalNotifications !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "operationalNotifications must be boolean.",
      });
    }

    if (typeof criticalNotifications !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "criticalNotifications must be boolean.",
      });
    }

    if (typeof aiDecisionSupport !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "aiDecisionSupport must be boolean.",
      });
    }

    /* ---------------------------------------------
       Update
    --------------------------------------------- */

    const result = await pool.query<SettingsRow>(
      `
      UPDATE system_settings
      SET
        critical_stock_days = $1,
        warning_stock_days = $2,
        auto_refresh_enabled = $3,
        refresh_interval_seconds = $4,
        operational_notifications = $5,
        critical_notifications = $6,
        ai_decision_support = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING
        id,
        critical_stock_days,
        warning_stock_days,
        auto_refresh_enabled,
        refresh_interval_seconds,
        operational_notifications,
        critical_notifications,
        ai_decision_support,
        updated_at
      `,
      [
        criticalStockDays,
        warningStockDays,
        autoRefreshEnabled,
        refreshIntervalSeconds,
        operationalNotifications,
        criticalNotifications,
        aiDecisionSupport,
      ]
    );

    const settings = result.rows[0];

    return res.json({
      success: true,
      message: "Settings updated successfully.",
      data: {
        criticalStockDays: settings.critical_stock_days,
        warningStockDays: settings.warning_stock_days,
        autoRefreshEnabled: settings.auto_refresh_enabled,
        refreshIntervalSeconds:
          settings.refresh_interval_seconds,
        operationalNotifications:
          settings.operational_notifications,
        criticalNotifications:
          settings.critical_notifications,
        aiDecisionSupport:
          settings.ai_decision_support,
        updatedAt: settings.updated_at,
      },
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update system settings",
    });
  }
});

/* -------------------------------------------------
   RESET SETTINGS
   POST /api/settings/reset
------------------------------------------------- */

router.post("/reset", async (_req, res) => {
  try {
    await ensureSettingsTable();

    const result = await pool.query<SettingsRow>(`
      UPDATE system_settings
      SET
        critical_stock_days = 3,
        warning_stock_days = 7,
        auto_refresh_enabled = TRUE,
        refresh_interval_seconds = 60,
        operational_notifications = TRUE,
        critical_notifications = TRUE,
        ai_decision_support = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING
        id,
        critical_stock_days,
        warning_stock_days,
        auto_refresh_enabled,
        refresh_interval_seconds,
        operational_notifications,
        critical_notifications,
        ai_decision_support,
        updated_at
    `);

    const settings = result.rows[0];

    return res.json({
      success: true,
      message: "Settings restored to default values.",
      data: {
        criticalStockDays: settings.critical_stock_days,
        warningStockDays: settings.warning_stock_days,
        autoRefreshEnabled: settings.auto_refresh_enabled,
        refreshIntervalSeconds:
          settings.refresh_interval_seconds,
        operationalNotifications:
          settings.operational_notifications,
        criticalNotifications:
          settings.critical_notifications,
        aiDecisionSupport:
          settings.ai_decision_support,
        updatedAt: settings.updated_at,
      },
    });
  } catch (error) {
    console.error("POST /api/settings/reset error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset system settings",
    });
  }
});

export default router;