import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/query", async (req, res, next) => {
  try {
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const q = question.toLowerCase();

    let intent = "SYSTEM_SUMMARY";

    // --------------------------------------------------
    // TRANSPORT
    // --------------------------------------------------

    if (
      q.includes("transport") ||
      q.includes("vehicle") ||
      q.includes("asset") ||
      q.includes("route availability") ||
      q.includes("available route") ||
      q.includes("transport availability") ||
      q.includes("available transport")
    ) {
      intent = "TRANSPORT";
    }

    // --------------------------------------------------
    // OPTIMIZATION
    // --------------------------------------------------

    else if (
      q.includes("optimization") ||
      q.includes("optimisation") ||
      q.includes("allocation") ||
      q.includes("recommendation") ||
      q.includes("recommended allocation") ||
      q.includes("optimization run") ||
      q.includes("latest optimization") ||
      q.includes("planning")
    ) {
      intent = "OPTIMIZATION";
    }

    // --------------------------------------------------
    // SUPPLY REQUESTS
    // IMPORTANT:
    // Must come before ALERTS because questions such as
    // "pending critical supply requests" contain "critical".
    // --------------------------------------------------

    else if (
      q.includes("supply request") ||
      q.includes("supply requests") ||
      q.includes("pending supply") ||
      q.includes("critical supply") ||
      q.includes("critical request") ||
      q.includes("critical requests") ||
      q.includes("pending request") ||
      q.includes("pending requests") ||
      q.includes("show requests") ||
      q.includes("show supply")
    ) {
      intent = "SUPPLY_REQUESTS";
    }

    // --------------------------------------------------
    // INVENTORY RISK
    // --------------------------------------------------

    else if (
      q.includes("shortage") ||
      q.includes("stockout") ||
      q.includes("stock out") ||
      q.includes("stock risk") ||
      q.includes("inventory risk") ||
      q.includes("inventory") ||
      q.includes("days of supply")
    ) {
      intent = "INVENTORY_RISK";
    }

    // --------------------------------------------------
    // FORECAST
    // --------------------------------------------------

    else if (
      q.includes("forecast") ||
      q.includes("demand forecast") ||
      q.includes("demand prediction") ||
      q.includes("prediction") ||
      q.includes("predicted demand")
    ) {
      intent = "FORECAST";
    }

    // --------------------------------------------------
    // ALERTS
    // --------------------------------------------------

    else if (
      q.includes("alert") ||
      q.includes("alerts") ||
      q.includes("warning") ||
      q.includes("warnings") ||
      q.includes("unresolved alert") ||
      q.includes("unresolved alerts") ||
      q.includes("operational alert")
    ) {
      intent = "ALERTS";
    }

    // --------------------------------------------------
    // GENERIC SUPPLY / REQUEST FALLBACK
    // --------------------------------------------------

    else if (
      q.includes("request") ||
      q.includes("requests") ||
      q.includes("pending") ||
      q.includes("supply")
    ) {
      intent = "SUPPLY_REQUESTS";
    }

    // ==================================================
    // INVENTORY RISK
    // ==================================================

    if (intent === "INVENTORY_RISK") {
      const result = await pool.query(`
        SELECT
          l.code AS location,
          l.name AS location_name,
          i.code AS item_code,
          i.name AS item,
          inv.current_quantity,
          inv.days_of_supply,
          inv.status
        FROM inventory inv
        JOIN locations l
          ON l.id = inv.location_id
        JOIN items i
          ON i.id = inv.item_id
        WHERE inv.status IN ('RED', 'AMBER')
        ORDER BY
          CASE inv.status
            WHEN 'RED' THEN 1
            WHEN 'AMBER' THEN 2
            ELSE 3
          END,
          inv.days_of_supply ASC
        LIMIT 10
      `);

      return res.json({
        success: true,
        data: {
          question,
          intent,

          answer:
            result.rows.length > 0
              ? `There are ${result.rows.length} location/item records currently showing AMBER or RED inventory risk. The highest-risk records are listed below based on Days of Supply.`
              : "No AMBER or RED inventory risk is currently present in the database.",

          records: result.rows,
        },
      });
    }

    // ==================================================
    // FORECAST
    // ==================================================

    if (intent === "FORECAST") {
      const result = await pool.query(`
        SELECT
          f.forecast_date,
          l.code AS location,
          i.name AS item,
          f.predicted_quantity,
          f.model_name
        FROM forecasts f
        JOIN locations l
          ON l.id = f.location_id
        JOIN items i
          ON i.id = f.item_id
        ORDER BY f.forecast_date ASC
        LIMIT 14
      `);

      return res.json({
        success: true,
        data: {
          question,
          intent,

          answer:
            result.rows.length > 0
              ? "The following forecast records are available from the current system data."
              : "No forecast records are currently available. Run a forecast first.",

          records: result.rows,
        },
      });
    }

    // ==================================================
    // ALERTS
    // ==================================================

    if (intent === "ALERTS") {
      const result = await pool.query(`
        SELECT
          severity,
          title,
          message,
          created_at
        FROM alerts
        WHERE is_resolved = false
        ORDER BY
          CASE severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'WARNING' THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT 10
      `);

      return res.json({
        success: true,
        data: {
          question,
          intent,

          answer:
            result.rows.length > 0
              ? `${result.rows.length} active alerts are currently available.`
              : "There are currently no unresolved alerts.",

          records: result.rows,
        },
      });
    }

    // ==================================================
    // SUPPLY REQUESTS
    // ==================================================

    if (intent === "SUPPLY_REQUESTS") {
      const result = await pool.query(`
        SELECT
          sr.id,
          sr.request_code,
          sr.quantity,
          sr.priority,
          sr.status,
          sr.required_by,
          sr.reason,
          l.code AS destination,
          l.name AS destination_name,
          i.code AS item_code,
          i.name AS item
        FROM supply_requests sr
        JOIN locations l
          ON l.id = sr.location_id
        JOIN items i
          ON i.id = sr.item_id
        WHERE sr.status IN (
          'SUBMITTED',
          'UNDER_REVIEW',
          'PLANNED',
          'APPROVED'
        )
        ORDER BY
          CASE sr.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            ELSE 4
          END,
          sr.required_by ASC
        LIMIT 10
      `);

      // ------------------------------------------------
      // Build a useful natural-language response
      // ------------------------------------------------

      let answer: string;

      if (result.rows.length === 0) {
        answer = "There are currently no pending supply requests.";
      } else if (result.rows.length === 1) {
        const r = result.rows[0];

        answer =
          `There is 1 pending supply request currently available.\n\n` +
          `Request: ${r.request_code}\n` +
          `Location: ${r.destination} - ${r.destination_name}\n` +
          `Item: ${r.item}\n` +
          `Quantity: ${r.quantity}\n` +
          `Priority: ${r.priority}\n` +
          `Status: ${r.status}\n` +
          `Required by: ${r.required_by ? r.required_by : "Not specified"}`;
      } else {
        const requestSummary = result.rows
          .map(
            (r: any) =>
              `${r.request_code} — ${r.item} (${r.quantity}) — ${r.priority} — ${r.status}`
          )
          .join("\n");

        answer =
          `There are ${result.rows.length} pending supply requests currently available.\n\n` +
          requestSummary;
      }

      return res.json({
        success: true,

        data: {
          question,
          intent,

          answer,

          // Full structured records for frontend rendering
          records: result.rows,

          summary: {
            total: result.rows.length,

            critical: result.rows.filter(
              (r: any) => r.priority === "CRITICAL"
            ).length,

            high: result.rows.filter(
              (r: any) => r.priority === "HIGH"
            ).length,

            medium: result.rows.filter(
              (r: any) => r.priority === "MEDIUM"
            ).length,
          },
        },
      });
    }

    // ==================================================
    // TRANSPORT
    // ==================================================

    if (intent === "TRANSPORT") {
      const [assets, routes] = await Promise.all([
        pool.query(`
          SELECT
            vehicle_code,
            asset_type,
            capacity,
            capacity_unit,
            status,
            availability_percent
          FROM transport_assets
          ORDER BY vehicle_code
        `),

        pool.query(`
          SELECT
            r.route_code,
            fl.code AS from_code,
            tl.code AS to_code,
            r.distance_km,
            r.estimated_time_hours,
            r.capacity,
            r.road_condition,
            r.weather_impact,
            r.availability_percent,
            r.is_available
          FROM routes r
          JOIN locations fl
            ON fl.id = r.from_location_id
          JOIN locations tl
            ON tl.id = r.to_location_id
          ORDER BY r.route_code
        `),
      ]);

      const totalAssets = assets.rows.length;

      const availableAssets = assets.rows.filter(
        (asset: any) => asset.status === "AVAILABLE"
      ).length;

      const availableRoutes = routes.rows.filter(
        (route: any) => route.is_available
      ).length;

      const averageAssetAvailability =
        totalAssets > 0
          ? (
              assets.rows.reduce(
                (sum: number, asset: any) =>
                  sum + Number(asset.availability_percent || 0),
                0
              ) / totalAssets
            ).toFixed(1)
          : "0.0";

      return res.json({
        success: true,

        data: {
          question,
          intent,

          answer: `Current transport data shows ${availableAssets} of ${totalAssets} transport assets available and ${availableRoutes} of ${routes.rows.length} routes available. Average asset availability is ${averageAssetAvailability}%.`,

          summary: {
            totalAssets,
            availableAssets,
            totalRoutes: routes.rows.length,
            availableRoutes,
            averageAssetAvailability: Number(
              averageAssetAvailability
            ),
          },

          assets: assets.rows,
          routes: routes.rows,
        },
      });
    }

    // ==================================================
    // OPTIMIZATION
    // ==================================================

    if (intent === "OPTIMIZATION") {
      const result = await pool.query(`
        SELECT
          id,
          run_type,
          status,
          solver_name,
          input_summary,
          output_summary,
          created_at
        FROM optimization_runs
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (!result.rows[0]) {
        return res.json({
          success: true,

          data: {
            question,
            intent,

            answer:
              "No optimization run is currently available. Run the optimization engine first.",

            run: null,
          },
        });
      }

      const run = result.rows[0];

      return res.json({
        success: true,

        data: {
          question,
          intent,

          answer:
            "The latest optimization run is available from the current system data. The allocation plan and explanation are shown below.",

          run: {
            id: run.id,
            runType: run.run_type,
            status: run.status,
            solverName: run.solver_name,
            inputSummary: run.input_summary,
            outputSummary: run.output_summary,
            createdAt: run.created_at,
          },
        },
      });
    }

    // ==================================================
    // DEFAULT SYSTEM SUMMARY
    // ==================================================

    const [alerts, inventory, requests] = await Promise.all([
      pool.query(`
        SELECT
          severity,
          title,
          message
        FROM alerts
        WHERE is_resolved = false
        ORDER BY created_at DESC
        LIMIT 5
      `),

      pool.query(`
        SELECT
          l.code AS location,
          i.name AS item,
          inv.days_of_supply,
          inv.status
        FROM inventory inv
        JOIN locations l
          ON l.id = inv.location_id
        JOIN items i
          ON i.id = inv.item_id
        WHERE inv.status IN ('RED', 'AMBER')
        ORDER BY inv.days_of_supply ASC
        LIMIT 5
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM supply_requests
        WHERE status IN (
          'SUBMITTED',
          'UNDER_REVIEW',
          'PLANNED',
          'APPROVED'
        )
      `),
    ]);

    return res.json({
      success: true,

      data: {
        question,
        intent,

        answer: `Based on current system data, ${alerts.rows.length} active alerts are visible, ${inventory.rows.length} inventory records are in AMBER/RED status, and ${requests.rows[0].count} supply requests are pending review.`,

        alerts: alerts.rows,

        inventoryRisks: inventory.rows,

        pendingRequests: requests.rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;