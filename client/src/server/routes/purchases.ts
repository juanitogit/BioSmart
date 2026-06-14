import { Router } from "express";
import { db } from "../db/index.js";
import { sales, products, users } from "../db/schema.js";
import { eq, desc, sum, count, gte, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const purchasesRouter = Router();

// GET /api/purchases - historial del comprador
purchasesRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ purchases: [], total: 0 }); return; }

    const myPurchases = await db
      .select({
        id: sales.id,
        quantity: sales.quantity,
        totalAmount: sales.totalAmount,
        createdAt: sales.createdAt,
        product: {
          id: products.id,
          name: products.name,
          image: products.image,
          price: products.price,
          category: products.category,
        },
        seller: {
          id: users.id,
          name: users.name,
        },
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .innerJoin(users, eq(sales.sellerId, users.id))
      .where(eq(sales.buyerId, req.user!.id))
      .orderBy(desc(sales.createdAt));

    const totalResult = await db
      .select({ total: sum(sales.totalAmount) })
      .from(sales)
      .where(eq(sales.buyerId, req.user!.id));

    const total = parseFloat(totalResult[0]?.total as string || "0");

    res.json({ purchases: myPurchases, total });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.json({ purchases: [], total: 0 });
  }
});

// GET /api/purchases/export-csv - exportar historial CSV
purchasesRouter.get("/export-csv", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }

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
      .where(eq(sales.buyerId, req.user!.id))
      .orderBy(desc(sales.createdAt));

    const BOM = "\uFEFF";
    const header = "ID,Producto,Categoría,Vendedor,Cantidad,Total (USD),Fecha\n";
    const rows = myPurchases.map(p =>
      `${p.id},"${p.productName}","${p.productCategory || ''}","${p.sellerName}",${p.quantity},${p.totalAmount},${new Date(p.createdAt).toLocaleDateString('es-MX')}`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=historial-compras.csv");
    res.send(BOM + header + rows);
  } catch (error) {
    console.error("Error exporting purchases:", error);
    res.status(500).json({ error: "Error al exportar" });
  }
});
