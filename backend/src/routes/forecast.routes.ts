import { Router } from "express";
import { z } from "zod";

import pool from "../config/database.js";
import {
  authenticate,
  authorize,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);


// ======================================================
// GET FORECASTS
// ======================================================

router.get("/", async (req, res, next) => {
  try {
    const locationId = String(
      req.query.locationId || ""
    );

    const itemId = String(
      req.query.itemId || ""
    );

    const result = await pool.query(
      `
      SELECT
        df.*,
        l.code AS location_code,
        i.name AS item_name,
        i.category
      FROM demand_forecasts df
      JOIN locations l
        ON l.id = df.location_id
      JOIN items i
        ON i.id = df.item_id
      WHERE
        ($1 = '' OR df.location_id = $1::uuid)
        AND
        ($2 = '' OR df.item_id = $2::uuid)
      ORDER BY df.forecast_date ASC
      LIMIT 500
      `,
      [
        locationId,
        itemId,
      ]
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
// RUN RANDOM FOREST FORECAST
// ======================================================

router.post(
  "/run",
  authorize(
    "ADMIN",
    "LOGISTICS_PLANNER",
    "ANALYST"
  ),
  async (req, res, next) => {
    try {

      // --------------------------------------------------
      // Validate request
      // --------------------------------------------------

      const body = z
        .object({
          locationId: z.string().uuid(),
          itemId: z.string().uuid(),
          horizon: z
            .number()
            .int()
            .min(1)
            .max(30)
            .default(7),
        })
        .parse(req.body);


      // --------------------------------------------------
      // Get location + item codes
      // --------------------------------------------------

      const reference = await pool.query(
        `
        SELECT
          l.code AS location_code,
          i.code AS item_code
        FROM locations l
        CROSS JOIN items i
        WHERE
          l.id = $1
          AND i.id = $2
        LIMIT 1
        `,
        [
          body.locationId,
          body.itemId,
        ]
      );


      if (!reference.rows.length) {
        return res.status(404).json({
          success: false,
          message:
            "Location or item not found",
        });
      }


      const locationCode =
        reference.rows[0].location_code;

      const itemCode =
        reference.rows[0].item_code;


      // --------------------------------------------------
      // ML Service URL
      // --------------------------------------------------

      const mlServiceUrl =
        process.env.ML_SERVICE_URL ||
        "http://localhost:8000";


      // --------------------------------------------------
      // Call Python ML Service
      // --------------------------------------------------

      const mlResponse = await fetch(
        `${mlServiceUrl}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            location_id: locationCode,
            item_id: itemCode,
            days: body.horizon,
          }),
        }
      );


      const mlData =
        await mlResponse.json();


      // --------------------------------------------------
      // ML error
      // --------------------------------------------------

      if (!mlResponse.ok) {
        return res.status(
          mlResponse.status
        ).json({
          success: false,
          message:
            mlData.detail ||
            "ML forecasting failed",
        });
      }


      // --------------------------------------------------
      // Create forecast run
      // --------------------------------------------------

      const run =
        await pool.query(
          `
          INSERT INTO optimization_runs
          (
            run_type,
            status,
            created_by,
            input_summary
          )
          VALUES
          (
            'FORECAST',
            'COMPLETED',
            $1,
            $2
          )
          RETURNING id
          `,
          [
            req.user!.id,

            JSON.stringify({
              method: "RandomForest",

              locationId:
                body.locationId,

              itemId:
                body.itemId,

              locationCode,

              itemCode,

              horizon:
                body.horizon,
            }),
          ]
        );


      // --------------------------------------------------
      // Store predictions
      // --------------------------------------------------

      const rows = [];


      for (
        const prediction
        of mlData.forecast
      ) {

        const result =
          await pool.query(
            `
            INSERT INTO demand_forecasts
            (
              location_id,
              item_id,
              forecast_date,
              predicted_quantity,
              model_name,
              model_version,
              horizon_days,
              source
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              'Random Forest',
              'rf-1.0',
              $5,
              'python-ml-service'
            )
            RETURNING *
            `,
            [
              body.locationId,

              body.itemId,

              prediction.date,

              prediction.predicted_demand,

              body.horizon,
            ]
          );


        rows.push(
          result.rows[0]
        );
      }


      // --------------------------------------------------
      // Response
      // --------------------------------------------------

      return res.status(201).json({
        success: true,

        runId:
          run.rows[0].id,

        method:
          "RandomForest",

        locationId:
          body.locationId,

        itemId:
          body.itemId,

        forecastDays:
          body.horizon,

        data: rows,
      });

    } catch (error) {
      next(error);
    }
  }
);


// ======================================================
// BASELINE MOVING AVERAGE
// ======================================================

router.post(
  "/baseline",
  authorize(
    "ADMIN",
    "LOGISTICS_PLANNER",
    "ANALYST"
  ),
  async (req, res, next) => {

    try {

      const b = z
        .object({
          locationId:
            z.string().uuid(),

          itemId:
            z.string().uuid(),

          horizon:
            z.number()
              .int()
              .min(1)
              .max(30)
              .default(7),
        })
        .parse(req.body);


      // --------------------------------------------------
      // Historical consumption
      // --------------------------------------------------

      const history =
        await pool.query(
          `
          SELECT
            consumption_date,
            quantity
          FROM consumption_history
          WHERE
            location_id = $1
            AND item_id = $2
          ORDER BY
            consumption_date DESC
          LIMIT 30
          `,
          [
            b.locationId,
            b.itemId,
          ]
        );


      if (!history.rows.length) {

        return res.status(400).json({
          success: false,
          message:
            "No consumption history available",
        });

      }


      // --------------------------------------------------
      // Moving average
      // --------------------------------------------------

      const avg =
        history.rows.reduce(
          (
            sum: number,
            row: {
              quantity: number | string;
            }
          ) =>
            sum +
            Number(row.quantity),

          0
        ) / history.rows.length;


      // --------------------------------------------------
      // Create run
      // --------------------------------------------------

      const run =
        await pool.query(
          `
          INSERT INTO optimization_runs
          (
            run_type,
            status,
            created_by,
            input_summary
          )
          VALUES
          (
            'FORECAST',
            'COMPLETED',
            $1,
            $2
          )
          RETURNING id
          `,
          [
            req.user!.id,

            JSON.stringify({
              method:
                "moving_average",

              historyPoints:
                history.rows.length,

              average: avg,
            }),
          ]
        );


      // --------------------------------------------------
      // Store baseline forecasts
      // --------------------------------------------------

      const rows = [];


      for (
        let d = 1;
        d <= b.horizon;
        d++
      ) {

        const date =
          new Date(
            Date.now() +
              d *
                86400000
          )
            .toISOString()
            .slice(0, 10);


        const result =
          await pool.query(
            `
            INSERT INTO demand_forecasts
            (
              location_id,
              item_id,
              forecast_date,
              predicted_quantity,
              model_name,
              model_version,
              horizon_days,
              source
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              'Moving Average',
              'baseline-1.0',
              $5,
              'synthetic-consumption'
            )
            RETURNING *
            `,
            [
              b.locationId,

              b.itemId,

              date,

              Number(
                avg.toFixed(2)
              ),

              b.horizon,
            ]
          );


        rows.push(
          result.rows[0]
        );
      }


      // --------------------------------------------------
      // Response
      // --------------------------------------------------

      return res.status(201).json({
        success: true,

        runId:
          run.rows[0].id,

        method:
          "moving_average",

        data: rows,
      });

    } catch (error) {
      next(error);
    }
  }
);


export default router;