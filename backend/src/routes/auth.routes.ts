import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import pool from "../config/database.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";

import type { AuthRequest } from "../types/auth.js";

import {
  generateOtp,
  hashOtp,
} from "../utils/otp.js";

import {
  sendOtpEmail,
} from "../services/email.service.js";

const router = Router();

/* =====================================================
   SCHEMAS
===================================================== */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const sendOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

/* =====================================================
   PASSWORD LOGIN
===================================================== */

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const result = await pool.query(
      `SELECT
         id,
         email,
         password_hash,
         name,
         role,
         is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [body.email]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const valid = await bcrypt.compare(
      body.password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      env.jwtSecret,
      {
        expiresIn: env.jwtExpiresIn,
      } as jwt.SignOptions
    );

    await pool.query(
      `INSERT INTO audit_logs
       (user_id, action, entity_type, details)
       VALUES ($1, 'LOGIN', 'USER', $2)`,
      [
        user.id,
        JSON.stringify({
          email: user.email,
          method: "PASSWORD",
        }),
      ]
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: payload,
    });
  } catch (error) {
    console.error("❌ PASSWORD LOGIN ERROR:", error);
    next(error);
  }
});

/* =====================================================
   SEND EMAIL OTP
===================================================== */

router.post("/send-otp", async (req, res, next) => {
  try {
    const body = sendOtpSchema.parse(req.body);

    const email = body.email.trim().toLowerCase();

    console.log(
      `📧 OTP request received for: ${email}`
    );

    /* ---------------------------------------------
       Check active user
    --------------------------------------------- */

    const userResult = await pool.query(
      `SELECT
         id,
         email,
         name,
         role,
         is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    const user = userResult.rows[0];

    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        message:
          "No active account found with this email",
      });
    }

    /* ---------------------------------------------
       Generate OTP
    --------------------------------------------- */

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresInMinutes = 5;

    /* ---------------------------------------------
       Invalidate previous OTPs
    --------------------------------------------- */

    await pool.query(
      `UPDATE email_otps
       SET verified = TRUE
       WHERE LOWER(email) = LOWER($1)
       AND verified = FALSE`,
      [email]
    );

    /* ---------------------------------------------
       Store OTP hash
    --------------------------------------------- */

    await pool.query(
      `INSERT INTO email_otps
       (
         email,
         otp_hash,
         expires_at,
         attempts,
         verified
       )
       VALUES
       (
         $1,
         $2,
         NOW() + ($3 * INTERVAL '1 minute'),
         0,
         FALSE
       )`,
      [
        email,
        otpHash,
        expiresInMinutes,
      ]
    );

    console.log(
      `💾 OTP stored for ${email}`
    );

    /* ---------------------------------------------
       Send email
    --------------------------------------------- */

    await sendOtpEmail(
      email,
      otp,
      expiresInMinutes
    );

    console.log(
      `📨 OTP email sent to ${email}`
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      expiresInMinutes,
    });
  } catch (error) {
    console.error("❌ SEND OTP ERROR:", error);
    next(error);
  }
});

/* =====================================================
   VERIFY EMAIL OTP
===================================================== */

router.post(
  "/verify-otp",
  async (req, res, next) => {
    try {
      const body =
        verifyOtpSchema.parse(req.body);

      const email = body.email
        .trim()
        .toLowerCase();

      const otp = body.otp.trim();

      console.log(
        `🔐 OTP verification requested for: ${email}`
      );

      /* ---------------------------------------------
         Find active user
      --------------------------------------------- */

      const userResult = await pool.query(
        `SELECT
           id,
           email,
           name,
           role,
           is_active
         FROM users
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [email]
      );

      const user = userResult.rows[0];

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: "Invalid account",
        });
      }

      /* ---------------------------------------------
         Find latest active OTP
      --------------------------------------------- */

      const otpResult = await pool.query(
        `SELECT
           id,
           otp_hash,
           expires_at,
           attempts,
           verified
         FROM email_otps
         WHERE LOWER(email) = LOWER($1)
           AND verified = FALSE
         ORDER BY created_at DESC
         LIMIT 1`,
        [email]
      );

      const otpRecord = otpResult.rows[0];

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message:
            "No active OTP found. Please request a new OTP.",
        });
      }

      /* ---------------------------------------------
         Maximum attempts
      --------------------------------------------- */

      const MAX_ATTEMPTS = 5;

      if (
        Number(otpRecord.attempts) >=
        MAX_ATTEMPTS
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect attempts. Please request a new OTP.",
        });
      }

      /* ---------------------------------------------
         Check expiry
      --------------------------------------------- */

      if (
        new Date(otpRecord.expires_at).getTime() <=
        Date.now()
      ) {
        await pool.query(
          `UPDATE email_otps
           SET verified = TRUE
           WHERE id = $1`,
          [otpRecord.id]
        );

        return res.status(400).json({
          success: false,
          message:
            "OTP has expired. Please request a new OTP.",
        });
      }

      /* ---------------------------------------------
         Compare OTP hash
      --------------------------------------------- */

      const providedOtpHash = hashOtp(otp);

      if (
        providedOtpHash !==
        otpRecord.otp_hash
      ) {
        await pool.query(
          `UPDATE email_otps
           SET attempts = attempts + 1
           WHERE id = $1`,
          [otpRecord.id]
        );

        const remaining =
          MAX_ATTEMPTS -
          Number(otpRecord.attempts) -
          1;

        return res.status(401).json({
          success: false,
          message:
            remaining > 0
              ? `Invalid OTP. ${remaining} attempts remaining.`
              : "Too many incorrect attempts. Please request a new OTP.",
        });
      }

      /* ---------------------------------------------
         Mark OTP verified
      --------------------------------------------- */

      await pool.query(
        `UPDATE email_otps
         SET verified = TRUE
         WHERE id = $1`,
        [otpRecord.id]
      );

      /* ---------------------------------------------
         Generate JWT
      --------------------------------------------- */

      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      const token = jwt.sign(
        payload,
        env.jwtSecret,
        {
          expiresIn: env.jwtExpiresIn,
        } as jwt.SignOptions
      );

      /* ---------------------------------------------
         Audit log
      --------------------------------------------- */

      await pool.query(
        `INSERT INTO audit_logs
         (user_id, action, entity_type, details)
         VALUES ($1, 'LOGIN', 'USER', $2)`,
        [
          user.id,
          JSON.stringify({
            email: user.email,
            method: "EMAIL_OTP",
          }),
        ]
      );

      console.log(
        `✅ OTP verified successfully for ${email}`
      );

      /* ---------------------------------------------
         Response
      --------------------------------------------- */

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token,
        user: payload,
      });
    } catch (error) {
      console.error(
        "❌ VERIFY OTP ERROR:",
        error
      );

      next(error);
    }
  }
);

/* =====================================================
   CURRENT USER
===================================================== */

router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res) => {
    return res.json({
      success: true,
      user: req.user,
    });
  }
);

/* =====================================================
   EXPORT
===================================================== */

export default router;