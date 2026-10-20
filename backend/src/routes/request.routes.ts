import { Router } from "express";
import { z } from "zod";
import pool from "../config/database.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);


// ======================================================
// Helpers
// ======================================================

const requestStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "PLANNED",
  "APPROVED",
  "IN_TRANSIT",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
] as const;


const priorityValues = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;


// ======================================================
// GET /api/requests
// ======================================================

router.get("/", async (req, res, next) => {
  try {

    const result = await pool.query(`
      SELECT
        sr.*,

        l.code AS location_code,
        l.name AS location_name,

        i.code AS item_code,
        i.name AS item_name,
        i.category,
        i.unit

      FROM supply_requests sr

      JOIN locations l
        ON l.id = sr.location_id

      JOIN items i
        ON i.id = sr.item_id

      ORDER BY
        CASE sr.priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          ELSE 4
        END,
        sr.created_at DESC
    `);


    res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {

    next(error);
  }
});


// ======================================================
// GET /api/requests/:id
// ======================================================

router.get("/:id", async (req, res, next) => {
  try {

    const result = await pool.query(`
      SELECT
        sr.*,

        l.code AS location_code,
        l.name AS location_name,

        i.code AS item_code,
        i.name AS item_name,
        i.category,
        i.unit

      FROM supply_requests sr

      JOIN locations l
        ON l.id = sr.location_id

      JOIN items i
        ON i.id = sr.item_id

      WHERE sr.id = $1
    `, [
      req.params.id,
    ]);


    if (!result.rows[0]) {

      return res.status(404).json({
        success: false,
        message: "Request not found",
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
// Create Request Schema
// ======================================================

const createSchema = z.object({

  locationId:
    z.string().uuid(),

  itemId:
    z.string().uuid(),

  quantity:
    z.number().positive(),

  requiredBy:
    z.string().min(1),

  priority:
    z.enum(priorityValues)
      .default("MEDIUM"),

  reason:
    z.string()
      .min(3)
      .max(500),
});


// ======================================================
// POST /api/requests
// ======================================================

router.post(
  "/",

  authorize(
    "ADMIN",
    "LOGISTICS_PLANNER",
    "FIELD_OPERATOR"
  ),

  async (req, res, next) => {

    try {

      const body =
        createSchema.parse(
          req.body
        );


      // ------------------------------------------------
      // Validate required date
      // ------------------------------------------------

      const requiredDate =
        new Date(
          body.requiredBy
        );


      if (
        Number.isNaN(
          requiredDate.getTime()
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid requiredBy date",
        });
      }


      // ------------------------------------------------
      // Check location
      // ------------------------------------------------

      const location =
        await pool.query(
          `
          SELECT id, code, name
          FROM locations
          WHERE id = $1
          `,
          [
            body.locationId,
          ]
        );


      if (!location.rows[0]) {

        return res.status(404).json({
          success: false,
          message:
            "Location not found",
        });
      }


      // ------------------------------------------------
      // Check item
      // ------------------------------------------------

      const item =
        await pool.query(
          `
          SELECT id, code, name, category, unit
          FROM items
          WHERE id = $1
          `,
          [
            body.itemId,
          ]
        );


      if (!item.rows[0]) {

        return res.status(404).json({
          success: false,
          message:
            "Item not found",
        });
      }


      // ------------------------------------------------
      // Generate request code
      // ------------------------------------------------

      const requestCode =
        `REQ-${Date.now()
          .toString()
          .slice(-8)}`;


      // ------------------------------------------------
      // Insert request
      // ------------------------------------------------

      const result =
        await pool.query(
          `
          INSERT INTO supply_requests (
            request_code,
            location_id,
            item_id,
            quantity,
            required_by,
            priority,
            reason,
            created_by,
            status
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            'SUBMITTED'
          )

          RETURNING *
          `,
          [
            requestCode,
            body.locationId,
            body.itemId,
            body.quantity,
            body.requiredBy,
            body.priority,
            body.reason,
            req.user!.id,
          ]
        );


      res.status(201).json({

        success: true,

        message:
          "Supply request submitted successfully.",

        data: result.rows[0],
      });

    } catch (error) {

      next(error);
    }
  }
);


// ======================================================
// PATCH /api/requests/:id/status
// ======================================================

const statusSchema =
  z.object({

    status:
      z.enum(requestStatuses),
  });


router.patch(
  "/:id/status",

  authorize(
    "ADMIN",
    "LOGISTICS_PLANNER"
  ),

  async (req, res, next) => {

    try {

      const body =
        statusSchema.parse(
          req.body
        );


      // ------------------------------------------------
      // Check request exists
      // ------------------------------------------------

      const existing =
        await pool.query(
          `
          SELECT
            id,
            request_code,
            status
          FROM supply_requests
          WHERE id = $1
          `,
          [
            req.params.id,
          ]
        );


      if (!existing.rows[0]) {

        return res.status(404).json({
          success: false,
          message:
            "Request not found",
        });
      }


      const currentStatus =
        existing.rows[0].status;


      // ------------------------------------------------
      // Status transition validation
      // ------------------------------------------------

      const allowedTransitions:
        Record<string, string[]> = {

          DRAFT: [
            "SUBMITTED",
            "CANCELLED",
          ],

          SUBMITTED: [
            "UNDER_REVIEW",
            "CANCELLED",
          ],

          UNDER_REVIEW: [
            "PLANNED",
            "CANCELLED",
          ],

          PLANNED: [
            "APPROVED",
            "CANCELLED",
          ],

          APPROVED: [
            "IN_TRANSIT",
            "CANCELLED",
          ],

          IN_TRANSIT: [
            "DELIVERED",
          ],

          DELIVERED: [
            "CLOSED",
          ],

          CLOSED: [],

          CANCELLED: [],
        };


      const allowed =
        allowedTransitions[
          currentStatus
        ] || [];


      if (
        currentStatus !== body.status &&
        !allowed.includes(
          body.status
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Invalid status transition: ${currentStatus} → ${body.status}`,

        });
      }


      // ------------------------------------------------
      // Update status
      // ------------------------------------------------

      const result =
        await pool.query(
          `
          UPDATE supply_requests

          SET
            status = $1,
            reviewed_by = $2,
            reviewed_at = NOW(),
            updated_at = NOW()

          WHERE id = $3

          RETURNING *
          `,
          [
            body.status,
            req.user!.id,
            req.params.id,
          ]
        );


      res.json({

        success: true,

        message:
          "Request status updated successfully.",

        data:
          result.rows[0],
      });

    } catch (error) {

      next(error);
    }
  }
);


export default router;