import { Router } from "express";
import { db } from "../db/index.js";
import { sales, products } from "../db/schema.js";
import { eq, desc, sum, count, gte, sql } from "drizzle-orm";
import { authMiddleware, sellerMiddleware, type AuthRequest } from "../middleware/auth.js";

export const sellerDashboardRouter = Router();

// GET /api/seller/stats
sellerDashboardRouter.get("/stats", authMiddleware, sellerMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ stats: null }); return; }

    const totalResult = await db
      .select({ total: sum(sales.totalAmount), salesCount: count() })
      .from(sales)
      .where(eq(sales.sellerId, req.user!.id));

    const activeProductsResult = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.sellerId, req.user!.id));

    const totalRevenue = parseFloat(totalResult[0]?.total as string || "0");
    const totalSales = totalResult[0]?.salesCount || 0;
    const activeProducts = activeProductsResult[0]?.count || 0;
    const avgTicket = totalSales > 0 ? (totalRevenue / totalSales) : 0;

    res.json({
      stats: {
        totalRevenue,
        totalSales,
        activeProducts,
        avgTicket: parseFloat(avgTicket.toFixed(2)),
      }
    });
  } catch (error) {
    console.error("Error fetching seller stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/seller/monthly-revenue - ingresos últimos 6 meses
sellerDashboardRouter.get("/monthly-revenue", authMiddleware, sellerMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ monthly: [] }); return; }

    const rows = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        DATE_TRUNC('month', created_at) AS month_date,
        SUM(total_amount)::numeric AS revenue,
        COUNT(*) AS sales_count
      FROM sales
      WHERE seller_id = ${req.user!.id}
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `);

    res.json({ monthly: rows.rows });
  } catch (error) {
    console.error("Error fetching monthly revenue:", error);
    res.status(500).json({ error: "Error al obtener ingresos mensuales" });
  }
});

// GET /api/seller/top-products - top 5 productos por ingresos
sellerDashboardRouter.get("/top-products", authMiddleware, sellerMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ topProducts: [] }); return; }

    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.image,
        SUM(s.total_amount)::numeric AS revenue,
        COUNT(s.id) AS sales_count
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.seller_id = ${req.user!.id}
      GROUP BY p.id, p.name, p.image
      ORDER BY revenue DESC
      LIMIT 5
    `);

    res.json({ topProducts: rows.rows });
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ error: "Error al obtener top productos" });
  }
});

// GET /api/seller/recent-sales
sellerDashboardRouter.get("/recent-sales", authMiddleware, sellerMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ recentSales: [] }); return; }

    const rows = await db.execute(sql`
      SELECT
        s.id,
        s.quantity,
        s.total_amount,
        s.created_at,
        p.name AS product_name,
        p.image AS product_image,
        u.name AS buyer_name
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN users u ON s.buyer_id = u.id
      WHERE s.seller_id = ${req.user!.id}
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    res.json({ recentSales: rows.rows });
  } catch (error) {
    console.error("Error fetching recent sales:", error);
    res.status(500).json({ error: "Error al obtener ventas recientes" });
  }
});
