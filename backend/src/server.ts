import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import pool from "./config/database.js";

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import locationRoutes from "./routes/location.routes.js";
import itemRoutes from "./routes/item.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import consumptionRoutes from "./routes/consumption.routes.js";
import requestRoutes from "./routes/request.routes.js";
import transportRoutes from "./routes/transport.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import forecastRoutes from "./routes/forecast.routes.js";
import scenarioRoutes from "./routes/scenario.routes.js";
import optimizationRoutes from "./routes/optimization.routes.js";
import assistantRoutes from "./routes/assistant.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

import { verifyEmailService } from "./services/email.service.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

/* Security & Middleware */

const configuredOrigins = env.frontendUrl
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = new Set<string>([
  "https://logiforge-ai.vercel.app",
  ...configuredOrigins,
]);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (allowedOrigins.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    try {
      const hostname = new URL(normalizedOrigin).hostname;

      const isVercelPreview =
        /^logiforge-[a-z0-9-]+-souravsinghas-projects\.vercel\.app$/i.test(
          hostname
        );

      if (isVercelPreview) {
        callback(null, true);
        return;
      }
    } catch {
      // Reject invalid origins below.
    }

    console.warn("CORS blocked origin:", normalizedOrigin);
    callback(new Error("Origin not allowed by CORS"));
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

/* Root */

app.get("/", (_req, res) => {
  res.json({
    project: "LOGIFORGE AI",
    description: "Predictive Logistics Decision Support System",
    status: "running",
    environment: env.nodeEnv,
  });
});

/* Health Check */

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");

    res.status(200).json({
      success: true,
      backend: "connected",
      database: "connected",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("Health check database error:", error);

    res.status(503).json({
      success: false,
      backend: "connected",
      database: "disconnected",
    });
  }
});

/* API Routes */

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/consumption", consumptionRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/scenarios", scenarioRoutes);
app.use("/api/optimization", optimizationRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/settings", settingsRoutes);

/* Error Handling */

app.use(notFound);
app.use(errorHandler);

/* Start Server */

app.listen(env.port, "0.0.0.0", async () => {
  console.log(
    `LOGIFORGE AI backend running on port ${env.port}`
  );

  console.log(
    "Configured frontend origins:",
    [...allowedOrigins]
  );

  try {
    await verifyEmailService();
  } catch (error) {
    console.error("Email service initialization failed:", error);
  }
});