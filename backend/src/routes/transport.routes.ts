import { Router } from "express";
import { z } from "zod";
import pool from "../config/database.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

/* =========================================================
   GET TRANSPORT ASSETS
========================================================= */

router.get("/assets", async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        ta.*,
        l.code AS current_location_code,
        l.name AS current_location_name
      FROM transport_assets ta
      LEFT JOIN locations l
        ON l.id = ta.current_location_id
      ORDER BY
        CASE ta.status
          WHEN 'AVAILABLE' THEN 1
          WHEN 'ASSIGNED' THEN 2
          WHEN 'IN_TRANSIT' THEN 3
          WHEN 'MAINTENANCE' THEN 4
          ELSE 5
        END,
        ta.vehicle_code
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   GET ROUTES
========================================================= */

router.get("/routes", async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,

        a.code AS from_code,
        a.name AS from_name,

        b.code AS to_code,
        b.name AS to_name

      FROM routes r

      JOIN locations a
        ON a.id = r.from_location_id

      JOIN locations b
        ON b.id = r.to_location_id

      ORDER BY r.route_code
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   TRANSPORT OVERVIEW
========================================================= */

router.get("/overview", async (_req, res, next) => {
  try {
    const assetsResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE status = 'AVAILABLE'
        )::int AS available,
        COUNT(*) FILTER (
          WHERE status = 'ASSIGNED'
        )::int AS assigned,
        COUNT(*) FILTER (
          WHERE status = 'IN_TRANSIT'
        )::int AS in_transit,
        COUNT(*) FILTER (
          WHERE status = 'MAINTENANCE'
        )::int AS maintenance,
        COUNT(*) FILTER (
          WHERE status = 'UNAVAILABLE'
        )::int AS unavailable
      FROM transport_assets
    `);

    const routesResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE is_available = true
        )::int AS available,
        COUNT(*) FILTER (
          WHERE is_available = false
        )::int AS unavailable,
        COUNT(*) FILTER (
          WHERE road_condition <> 'NORMAL'
             OR weather_impact <> 'LOW'
        )::int AS disrupted
      FROM routes
    `);

    res.json({
      success: true,
      data: {
        assets: assetsResult.rows[0],
        routes: routesResult.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   ASSIGN TRANSPORT
========================================================= */

const assignSchema = z.object({
  requestId: z.string().uuid(),
  assetId: z.string().uuid(),
  routeId: z.string().uuid(),
  quantity: z.number().positive(),
});

router.post(
  "/assign",
  authorize("ADMIN", "LOGISTICS_PLANNER"),
  async (req, res, next) => {
    const client = await pool.connect();

    try {
      const body = assignSchema.parse(req.body);

      await client.query("BEGIN");

      /* -----------------------------------------------------
         1. GET SUPPLY REQUEST
      ----------------------------------------------------- */

      const requestResult = await client.query(
        `
        SELECT
          sr.*,
          l.code AS location_code,
          l.name AS location_name,
          i.code AS item_code,
          i.name AS item_name
        FROM supply_requests sr
        JOIN locations l
          ON l.id = sr.location_id
        JOIN items i
          ON i.id = sr.item_id
        WHERE sr.id = $1
        FOR UPDATE
        `,
        [body.requestId]
      );

      if (!requestResult.rows[0]) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Supply request not found",
        });
      }

      const request = requestResult.rows[0];

      /* -----------------------------------------------------
         2. VALIDATE REQUEST STATUS
      ----------------------------------------------------- */

      const allowedStatuses = [
        "APPROVED",
        "PLANNED",
      ];

      if (!allowedStatuses.includes(request.status)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Request cannot be assigned while status is ${request.status}`,
        });
      }

      /* -----------------------------------------------------
         3. VALIDATE ASSIGNMENT QUANTITY
      ----------------------------------------------------- */

      if (body.quantity > Number(request.quantity)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Transport quantity cannot exceed request quantity",
        });
      }

      /* -----------------------------------------------------
         4. GET TRANSPORT ASSET
      ----------------------------------------------------- */

      const assetResult = await client.query(
        `
        SELECT *
        FROM transport_assets
        WHERE id = $1
        FOR UPDATE
        `,
        [body.assetId]
      );

      if (!assetResult.rows[0]) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Transport asset not found",
        });
      }

      const asset = assetResult.rows[0];

      /* -----------------------------------------------------
         5. CHECK ASSET STATUS
      ----------------------------------------------------- */

      if (asset.status !== "AVAILABLE") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Transport asset is currently ${asset.status}`,
        });
      }

      /* -----------------------------------------------------
         6. CHECK ASSET CAPACITY
      ----------------------------------------------------- */

      if (body.quantity > Number(asset.capacity)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Transport quantity exceeds vehicle capacity of ${asset.capacity} ${asset.capacity_unit}`,
        });
      }

      /* -----------------------------------------------------
         7. GET ROUTE
      ----------------------------------------------------- */

      const routeResult = await client.query(
        `
        SELECT
          r.*,
          a.code AS from_code,
          a.name AS from_name,
          b.code AS to_code,
          b.name AS to_name
        FROM routes r
        JOIN locations a
          ON a.id = r.from_location_id
        JOIN locations b
          ON b.id = r.to_location_id
        WHERE r.id = $1
        FOR UPDATE
        `,
        [body.routeId]
      );

      if (!routeResult.rows[0]) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Route not found",
        });
      }

      const route = routeResult.rows[0];

      /* -----------------------------------------------------
         8. CHECK ROUTE AVAILABILITY
      ----------------------------------------------------- */

      if (!route.is_available) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Selected route is currently unavailable",
        });
      }

      /* -----------------------------------------------------
         9. CHECK ROUTE CAPACITY
      ----------------------------------------------------- */

      if (body.quantity > Number(route.capacity)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Quantity exceeds route capacity of ${route.capacity}`,
        });
      }

      /* -----------------------------------------------------
         10. UPDATE SUPPLY REQUEST
      ----------------------------------------------------- */

      const updatedRequest = await client.query(
        `
        UPDATE supply_requests
        SET
          status = 'IN_TRANSIT',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [body.requestId]
      );

      /* -----------------------------------------------------
         11. UPDATE TRANSPORT ASSET
      ----------------------------------------------------- */

      const updatedAsset = await client.query(
        `
        UPDATE transport_assets
        SET
          status = 'IN_TRANSIT',
          availability_percent = GREATEST(
            availability_percent - 10,
            0
          ),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [body.assetId]
      );

      /* -----------------------------------------------------
         12. AUDIT LOG
      ----------------------------------------------------- */

      await client.query(
        `
        INSERT INTO audit_logs(
          user_id,
          action,
          entity_type,
          entity_id,
          details
        )
        VALUES(
          $1,
          'TRANSPORT_ASSIGNED',
          'SUPPLY_REQUEST',
          $2,
          $3
        )
        `,
        [
          req.user!.id,
          body.requestId,
          JSON.stringify({
            requestCode: request.request_code,
            vehicleCode: asset.vehicle_code,
            routeCode: route.route_code,
            quantity: body.quantity,
            from: route.from_code,
            to: route.to_code,
          }),
        ]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Transport assigned successfully",
        data: {
          request: updatedRequest.rows[0],
          asset: updatedAsset.rows[0],
          route,
          assignment: {
            quantity: body.quantity,
            vehicle_code: asset.vehicle_code,
            route_code: route.route_code,
          },
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  }
);

export default router;