import { Router } from "express";
import { db } from "../db/index.js";
import { sales, products, users, aiInsights } from "../db/schema.js";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const exportRouter = Router();

function getDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// GET /api/export/telemetry-csv?days=30
exportRouter.get("/telemetry-csv", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const days = parseInt(req.query.days as string) || 30;
    const since = getDaysAgo(days);

    const data = await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, req.user!.id), gte(aiInsights.createdAt, since)))
      .orderBy(desc(aiInsights.createdAt));

    const BOM = "\uFEFF";
    const header = "ID,Sensor,Valor,Régimen,Confianza,Decisión,Fecha\n";
    const rows = data.map(r =>
      `"${r.id}","${r.sensorId}",${r.value},"${r.regime}",${r.confidence},"${r.decision}","${new Date(r.createdAt).toISOString()}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=telemetria-${days}dias.csv`);
    res.send(BOM + header + rows);
  } catch (error) {
    console.error("Error exporting telemetry CSV:", error);
    res.status(500).json({ error: "Error al exportar telemetría" });
  }
});

// GET /api/export/telemetry-json?days=30
exportRouter.get("/telemetry-json", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const days = parseInt(req.query.days as string) || 30;
    const since = getDaysAgo(days);

    const data = await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, req.user!.id), gte(aiInsights.createdAt, since)))
      .orderBy(desc(aiInsights.createdAt));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=telemetria-${days}dias.json`);
    res.json({ exported_at: new Date().toISOString(), period_days: days, count: data.length, data });
  } catch (error) {
    console.error("Error exporting telemetry JSON:", error);
    res.status(500).json({ error: "Error al exportar telemetría" });
  }
});

// GET /api/export/purchases-csv?days=30
exportRouter.get("/purchases-csv", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const days = parseInt(req.query.days as string) || 30;
    const since = getDaysAgo(days);

    const myPurchases = await db
      .select({
        id: sales.id,
        quantity: sales.quantity,
        totalAmount: sales.totalAmount,
        createdAt: sales.createdAt,
        productName: products.name,
        productCategory: products.category,
        sellerName: users.name,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .innerJoin(users, eq(sales.sellerId, users.id))
      .where(and(eq(sales.buyerId, req.user!.id), gte(sales.createdAt, since)))
      .orderBy(desc(sales.createdAt));

    const BOM = "\uFEFF";
    const header = "ID,Producto,Categoría,Vendedor,Cantidad,Total (USD),Fecha\n";
    const rows = myPurchases.map(p =>
      `${p.id},"${p.productName}","${p.productCategory || ''}","${p.sellerName}",${p.quantity},${p.totalAmount},"${new Date(p.createdAt).toLocaleDateString('es-MX')}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=compras-${days}dias.csv`);
    res.send(BOM + header + rows);
  } catch (error) {
    console.error("Error exporting purchases CSV:", error);
    res.status(500).json({ error: "Error al exportar compras" });
  }
});
