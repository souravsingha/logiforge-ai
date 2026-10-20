import { Router } from "express";
import { z } from "zod";
import pool from "../config/database.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);


// ======================================================
// Existing inventory status calculation
// ======================================================

function statusFor(days: number, minimum: number) {
  if (days <= Math.max(minimum, 2)) {
    return "RED";
  }

  if (days <= Math.max(minimum * 2, 5)) {
    return "AMBER";
  }

  return "GREEN";
}


// ======================================================
// GET /api/inventory
// ======================================================

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.search || "");

    const result = await pool.query(
      `
      SELECT
        inv.*,
        l.code AS location_code,
        l.name AS location_name,
        i.code AS item_code,
        i.name AS item_name,
        i.category,
        i.unit

      FROM inventory inv

      JOIN locations l
        ON l.id = inv.location_id

      JOIN items i
        ON i.id = inv.item_id

      WHERE
        (
          $1 = ''
          OR l.code ILIKE '%' || $1 || '%'
          OR i.name ILIKE '%' || $1 || '%'
        )

      ORDER BY
        CASE inv.status
          WHEN 'RED' THEN 1
          WHEN 'AMBER' THEN 2
          ELSE 3
        END,
        inv.days_of_supply ASC
      `,
      [q]
    );

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    next(error);
  }
});


// ======================================================
// GET /api/inventory/risk
//
// Forecast-aware inventory risk
// ======================================================

router.get("/risk", async (req, res, next) => {
  try {

    const result = await pool.query(`
      WITH forecast_summary AS (
        SELECT
          location_id,
          item_id,

          COUNT(*) AS forecast_days,

          AVG(predicted_quantity) AS avg_forecast_demand,

          SUM(predicted_quantity) AS forecast_total_demand,

          MAX(predicted_quantity) AS peak_forecast_demand

        FROM demand_forecasts

        WHERE forecast_date >= CURRENT_DATE

        GROUP BY
          location_id,
          item_id
      )

      SELECT

        inv.id,

        inv.location_id,
        inv.item_id,

        l.code AS location_code,
        l.name AS location_name,

        i.code AS item_code,
        i.name AS item_name,
        i.category,
        i.unit,

        inv.current_quantity,
        inv.daily_average_consumption,
        inv.days_of_supply,

        inv.minimum_threshold,
        inv.maximum_capacity,

        inv.status AS inventory_status,

        COALESCE(
          fs.forecast_days,
          0
        ) AS forecast_days,

        COALESCE(
          fs.avg_forecast_demand,
          inv.daily_average_consumption
        ) AS avg_forecast_demand,

        COALESCE(
          fs.forecast_total_demand,
          0
        ) AS forecast_total_demand,

        COALESCE(
          fs.peak_forecast_demand,
          inv.daily_average_consumption
        ) AS peak_forecast_demand

      FROM inventory inv

      JOIN locations l
        ON l.id = inv.location_id

      JOIN items i
        ON i.id = inv.item_id

      LEFT JOIN forecast_summary fs
        ON fs.location_id = inv.location_id
        AND fs.item_id = inv.item_id

      ORDER BY
        inv.days_of_supply ASC
    `);


    const data = result.rows.map((row) => {

      const currentInventory =
        Number(row.current_quantity || 0);

      const dailyConsumption =
        Number(row.daily_average_consumption || 0);

      const avgForecastDemand =
        Number(row.avg_forecast_demand || 0);

      const forecastTotalDemand =
        Number(row.forecast_total_demand || 0);

      const peakForecastDemand =
        Number(row.peak_forecast_demand || 0);

      const forecastDays =
        Number(row.forecast_days || 0);


      // ------------------------------------------------
      // Forecast-aware demand
      // ------------------------------------------------

      const effectiveDailyDemand =
        avgForecastDemand > 0
          ? avgForecastDemand
          : dailyConsumption;


      // ------------------------------------------------
      // Projected days of supply
      // ------------------------------------------------

      const projectedDaysOfSupply =
        effectiveDailyDemand > 0
          ? currentInventory / effectiveDailyDemand
          : 999;


      // ------------------------------------------------
      // Determine risk
      // ------------------------------------------------

      let riskLevel:
        | "GREEN"
        | "AMBER"
        | "RED";


      if (
        currentInventory <= 0 ||
        projectedDaysOfSupply <= 2 ||
        (
          forecastTotalDemand > 0 &&
          currentInventory < forecastTotalDemand
        )
      ) {

        riskLevel = "RED";

      } else if (
        projectedDaysOfSupply <= 5 ||
        (
          forecastTotalDemand > 0 &&
          currentInventory <
            forecastTotalDemand * 1.5
        )
      ) {

        riskLevel = "AMBER";

      } else {

        riskLevel = "GREEN";
      }


      // ------------------------------------------------
      // Stock-out prediction
      // ------------------------------------------------

      const stockoutRisk =
        riskLevel === "RED";


      // ------------------------------------------------
      // Estimated stock-out date
      // ------------------------------------------------

      let estimatedStockoutDate: string | null =
        null;


      if (
        effectiveDailyDemand > 0 &&
        currentInventory > 0
      ) {

        const daysUntilStockout =
          Math.max(
            0,
            Math.floor(
              currentInventory /
                effectiveDailyDemand
            )
          );


        const date =
          new Date();

        date.setDate(
          date.getDate() +
            daysUntilStockout
        );


        estimatedStockoutDate =
          date.toISOString().slice(
            0,
            10
          );
      }


      // ------------------------------------------------
      // Explainable reason
      // ------------------------------------------------

      let reason = "";

      if (riskLevel === "RED") {

        if (currentInventory <= 0) {

          reason =
            "Inventory is currently depleted.";

        } else if (
          forecastTotalDemand > 0 &&
          currentInventory < forecastTotalDemand
        ) {

          reason =
            "Forecasted demand exceeds available inventory.";

        } else {

          reason =
            "Projected days of supply are critically low.";
        }

      } else if (
        riskLevel === "AMBER"
      ) {

        if (
          forecastTotalDemand > 0 &&
          currentInventory <
            forecastTotalDemand * 1.5
        ) {

          reason =
            "Forecasted demand is approaching available supply.";

        } else {

          reason =
            "Inventory coverage requires attention.";
        }

      } else {

        reason =
          "Current inventory provides sufficient forecast coverage.";
      }


      return {

        id: row.id,

        locationId:
          row.location_id,

        itemId:
          row.item_id,

        locationCode:
          row.location_code,

        locationName:
          row.location_name,

        itemCode:
          row.item_code,

        itemName:
          row.item_name,

        category:
          row.category,

        unit:
          row.unit,

        currentInventory,

        dailyConsumption,

        daysOfSupply:
          Number(
            row.days_of_supply || 0
          ),

        forecastDays,

        avgForecastDemand:
          Number(
            avgForecastDemand.toFixed(2)
          ),

        forecastTotalDemand:
          Number(
            forecastTotalDemand.toFixed(2)
          ),

        peakForecastDemand:
          Number(
            peakForecastDemand.toFixed(2)
          ),

        projectedDaysOfSupply:
          Number(
            projectedDaysOfSupply.toFixed(2)
          ),

        riskLevel,

        stockoutRisk,

        estimatedStockoutDate,

        reason,
      };
    });


    const summary = {

      total:
        data.length,

      green:
        data.filter(
          (item) =>
            item.riskLevel === "GREEN"
        ).length,

      amber:
        data.filter(
          (item) =>
            item.riskLevel === "AMBER"
        ).length,

      red:
        data.filter(
          (item) =>
            item.riskLevel === "RED"
        ).length,

      stockoutRisk:
        data.filter(
          (item) =>
            item.stockoutRisk
        ).length,
    };


    res.json({
      success: true,
      summary,
      data,
    });

  } catch (error) {

    next(error);
  }
});


// ======================================================
// GET /api/inventory/:id
// ======================================================

router.get("/:id", async (req, res, next) => {
  try {

    const result = await pool.query(
      `
      SELECT
        inv.*,
        l.code AS location_code,
        l.name AS location_name,
        i.code AS item_code,
        i.name AS item_name,
        i.category,
        i.unit

      FROM inventory inv

      JOIN locations l
        ON l.id = inv.location_id

      JOIN items i
        ON i.id = inv.item_id

      WHERE inv.id = $1
      `,
      [req.params.id]
    );


    if (!result.rows[0]) {

      return res.status(404).json({
        success: false,
        message:
          "Inventory record not found",
      });
    }


    res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {

    next(error);
  }
});


// ======================================================
// PATCH /api/inventory/:id
// ======================================================

const updateSchema = z.object({

  currentQuantity:
    z.number().nonnegative(),

  minimumThreshold:
    z.number().nonnegative(),

  maximumCapacity:
    z.number().positive(),

  dailyAverageConsumption:
    z.number().nonnegative(),
});


router.patch(
  "/:id",

  authorize(
    "ADMIN",
    "DEPOT_MANAGER",
    "FIELD_OPERATOR"
  ),

  async (req, res, next) => {

    try {

      const body =
        updateSchema.parse(
          req.body
        );


      const days =
        body.dailyAverageConsumption === 0
          ? 999
          : body.currentQuantity /
            body.dailyAverageConsumption;


      const minimumDays =
        body.dailyAverageConsumption > 0
          ? body.minimumThreshold /
            body.dailyAverageConsumption
          : 3;


      const status =
        statusFor(
          days,
          minimumDays
        );


      const result =
        await pool.query(
          `
          UPDATE inventory

          SET
            current_quantity = $1,
            minimum_threshold = $2,
            maximum_capacity = $3,
            daily_average_consumption = $4,
            days_of_supply = $5,
            status = $6,
            last_updated = NOW()

          WHERE id = $7

          RETURNING *
          `,
          [
            body.currentQuantity,
            body.minimumThreshold,
            body.maximumCapacity,
            body.dailyAverageConsumption,
            days,
            status,
            req.params.id,
          ]
        );


      if (!result.rows[0]) {

        return res.status(404).json({
          success: false,
          message:
            "Inventory record not found",
        });
      }


      res.json({
        success: true,
        data: result.rows[0],
      });

    } catch (error) {

      next(error);
    }
  }
);


export default router;