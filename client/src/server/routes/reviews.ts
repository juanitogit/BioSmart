import { Router } from "express";
import { db } from "../db/index.js";
import { reviews, products } from "../db/schema.js";
import { eq, avg, count, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const reviewsRouter = Router();

// GET /api/reviews/:productId
reviewsRouter.get("/:productId", async (req, res) => {
  try {
    if (!db) { res.json({ reviews: [] }); return; }
    const productId = parseInt(req.params.productId);
    const allReviews = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(reviews.createdAt);
    res.json({ reviews: allReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.json({ reviews: [] });
  }
});

// POST /api/reviews/:productId
reviewsRouter.post("/:productId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const productId = parseInt(req.params.productId);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating debe ser entre 1 y 5" });
      return;
    }

    const existing = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.userId, req.user!.id)));

    if (existing.length > 0) {
      res.status(400).json({ error: "Ya dejaste una reseña para este producto" });
      return;
    }

    const [review] = await db.insert(reviews).values({
      productId,
      userId: req.user!.id,
      rating,
      comment,
    }).returning();

    // Update product average rating
    const result = await db
      .select({ avg: avg(reviews.rating), count: count() })
      .from(reviews)
      .where(eq(reviews.productId, productId));

    const newAvg = result[0]?.avg ? parseFloat(result[0].avg as string).toFixed(2) : "0";
    const newCount = result[0]?.count || 0;

    await db.update(products)
      .set({ rating: newAvg, reviewsCount: newCount })
      .where(eq(products.id, productId));

    res.json({ review, message: "Reseña publicada exitosamente" });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Error al publicar reseña" });
  }
});

// DELETE /api/reviews/:id
reviewsRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const reviewId = parseInt(req.params.id);

    const [existing] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!existing) { res.status(404).json({ error: "Reseña no encontrada" }); return; }
    if (existing.userId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "No autorizado" }); return;
    }

    const productId = existing.productId;
    await db.delete(reviews).where(eq(reviews.id, reviewId));

    const result = await db
      .select({ avg: avg(reviews.rating), count: count() })
      .from(reviews)
      .where(eq(reviews.productId, productId));

    const newAvg = result[0]?.avg ? parseFloat(result[0].avg as string).toFixed(2) : "0";
    const newCount = result[0]?.count || 0;

    await db.update(products)
      .set({ rating: newAvg, reviewsCount: newCount })
      .where(eq(products.id, productId));

    res.json({ message: "Reseña eliminada" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Error al eliminar reseña" });
  }
});
