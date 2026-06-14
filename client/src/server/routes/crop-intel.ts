import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { aiInsights, notifications } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const cropIntelRouter = Router();

const GO_ENGINE_URL = process.env.VCA_ENGINE_URL || "http://127.0.0.1:8090";

// ── Interfaces ──────────────────────────────────────────────

interface SensorReading {
  sensor_id: string;
  values: number[];
  timestamps: number[];
}

interface AnalyzePayload {
  user_id: number;
  readings: SensorReading[];
}

interface CriticalAlert {
  sensor_id: string;
  value: number;
  regime: string;
  confidence: number;
  message: string;
}

interface AnalyzeResponse {
  user_id: number;
  insights: any[];
  critical_alerts: CriticalAlert[];
  processed_at: string;
  total_racks: number;
  buffer_len: number;
}

// SSE clients for real-time notifications
const sseClients = new Map<number, Set<import("express").Response>>();

// ── POST /api/crop-intel/analyze ─────────────────────────────
// Proxy: intercepts sensor readings, sends to Go engine, persists results,
// and emits real-time alerts for CRITICAL decisions.
cropIntelRouter.post(
  "/analyze",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { readings } = req.body as { readings: SensorReading[] };

      if (!readings || !Array.isArray(readings) || readings.length === 0) {
        res.status(400).json({ error: "Se requiere al menos una lectura de sensor" });
        return;
      }

      // Build payload with injected user identity
      const payload: AnalyzePayload = {
        user_id: userId,
        readings,
      };

      // Forward to Go engine
      const goResponse = await fetch(`${GO_ENGINE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": String(userId),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!goResponse.ok) {
        const errorText = await goResponse.text();
        console.error(`[CROP-INTEL] Go engine error (${goResponse.status}): ${errorText}`);
        res.status(502).json({
          error: "Error en el motor de IA",
          detail: errorText,
        });
        return;
      }

      const result: AnalyzeResponse = await goResponse.json() as AnalyzeResponse;

      // Handle CRITICAL alerts
      if (result.critical_alerts && result.critical_alerts.length > 0) {
        // Persist notifications
        if (db) {
          for (const alert of result.critical_alerts) {
            await db.insert(notifications).values({
              userId,
              type: "crop_critical",
              title: "⚠️ Alerta Crítica de Cultivo",
              message: alert.message,
              isRead: false,
              emailSent: false,
            });
          }
        }

        // Emit SSE to connected clients
        emitToUser(userId, {
          type: "CRITICAL_ALERT",
          alerts: result.critical_alerts,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[CROP-INTEL] Analysis error:", error);

      if (error.name === "TimeoutError" || error.code === "ECONNREFUSED") {
        res.status(503).json({
          error: "Motor de IA no disponible",
          detail: "El servicio de análisis de cultivos no está respondiendo. Intente más tarde.",
        });
        return;
      }

      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ── GET /api/crop-intel/insights ─────────────────────────────
// Returns the user's historical AI insights (paginated).
cropIntelRouter.get(
  "/insights",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      if (!db) {
        res.json({ insights: [], total: 0 });
        return;
      }

      const insights = await db
        .select()
        .from(aiInsights)
        .where(eq(aiInsights.userId, userId))
        .orderBy(desc(aiInsights.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({
        insights,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("[CROP-INTEL] Insights query error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ── GET /api/crop-intel/health ───────────────────────────────
// Checks the Go engine health status.
cropIntelRouter.get("/health", async (_req, res) => {
  try {
    const goResponse = await fetch(`${GO_ENGINE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!goResponse.ok) {
      res.status(502).json({ status: "degraded", engine: "unreachable" });
      return;
    }

    const health = await goResponse.json();
    res.json({
      status: "ok",
      engine: health,
      proxy: "active",
    });
  } catch {
    res.status(503).json({
      status: "offline",
      engine: "unreachable",
      message: "El motor Go de IA no está disponible",
    });
  }
});

// ── GET /api/crop-intel/stream ───────────────────────────────
// SSE endpoint for real-time critical alerts.
cropIntelRouter.get(
  "/stream",
  authMiddleware,
  (req: AuthRequest, res) => {
    const userId = req.user!.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send initial connection event
    res.write(
      `data: ${JSON.stringify({ type: "CONNECTED", user_id: userId })}\n\n`
    );

    // Register SSE client
    if (!sseClients.has(userId)) {
      sseClients.set(userId, new Set());
    }
    sseClients.get(userId)!.add(res);

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 30000);

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.get(userId)?.delete(res);
      if (sseClients.get(userId)?.size === 0) {
        sseClients.delete(userId);
      }
    });
  }
);

// ── Emit SSE to a specific user ──────────────────────────────
function emitToUser(userId: number, data: any) {
  const clients = sseClients.get(userId);
  if (!clients) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}
