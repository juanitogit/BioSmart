import { Router, type Request, type Response } from "express";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();

// SSE clients map: userId -> Response[]
const sseClients: Map<number, Response[]> = new Map();

export function sendNotificationToUser(userId: number, notification: { type: string; title: string; message: string }) {
  const clients = sseClients.get(userId);
  if (clients && clients.length > 0) {
    const data = JSON.stringify(notification);
    clients.forEach(client => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (_) {}
    });
  }
}

// GET /api/notifications/stream - SSE endpoint (token via query param for EventSource)
notificationsRouter.get("/stream", (req: any, res: Response) => {
  // EventSource can't set headers, so we accept token via query param
  const token = req.query.token as string;
  if (!token) { res.status(401).end(); return; }
  const jwt = require("jsonwebtoken");
  try {
    const secret = process.env.JWT_SECRET || "default_secret_dev";
    req.user = jwt.verify(token, secret) as any;
  } catch {
    res.status(401).end();
    return;
  }
  return sseHandler(req, res);
});

function sseHandler(req: AuthRequest, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const userId = req.user!.id;
  if (!sseClients.has(userId)) sseClients.set(userId, []);
  sseClients.get(userId)!.push(res);

  res.write(`data: ${JSON.stringify({ type: "connected", title: "Conectado", message: "Escuchando alertas en tiempo real" })}\n\n`);

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch (_) {}
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    const clients = sseClients.get(userId) || [];
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
    if (clients.length === 0) sseClients.delete(userId);
  });
}

// GET /api/notifications - get all notifications
notificationsRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ notifications: [] }); return; }
    const all = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json({ notifications: all });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.json({ notifications: [] });
  }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch("/:id/read", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ ok: true }); return; }
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error al marcar como leída" });
  }
});

// PATCH /api/notifications/read-all
notificationsRouter.patch("/read-all", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ ok: true }); return; }
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user!.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error al marcar todas como leídas" });
  }
});

// DELETE /api/notifications/clear
notificationsRouter.delete("/clear", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ ok: true }); return; }
    await db.delete(notifications).where(eq(notifications.userId, req.user!.id));
    res.json({ ok: true, message: "Historial limpiado" });
  } catch (error) {
    res.status(500).json({ error: "Error al limpiar notificaciones" });
  }
});

// POST /api/notifications - create (internal use / admin)
notificationsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const { title, message, type } = req.body;
    const [notif] = await db.insert(notifications).values({
      userId: req.user!.id,
      type: type || "info",
      title,
      message,
    }).returning();

    sendNotificationToUser(req.user!.id, { type: notif.type, title: notif.title, message: notif.message });
    res.json({ notification: notif });
  } catch (error) {
    res.status(500).json({ error: "Error al crear notificación" });
  }
});
