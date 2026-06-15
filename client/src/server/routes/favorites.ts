import { Router } from "express";
import { db } from "../db/index.js";
import { favorites, products } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const favoritesRouter = Router();

// GET /api/favorites - get my favorites
favoritesRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ favorites: [] }); return; }
    const myFavorites = await db
      .select({
        id: favorites.id,
        productId: favorites.productId,
        createdAt: favorites.createdAt,
        product: {
          id: products.id,
          name: products.name,
          price: products.price,
          image: products.image,
          category: products.category,
          rating: products.rating,
          stock: products.stock,
          sellerId: products.sellerId,
        },
      })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .where(eq(favorites.userId, req.user!.id));
    res.json({ favorites: myFavorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.json({ favorites: [] });
  }
});

// POST /api/favorites/:productId - toggle favorite
favoritesRouter.post("/:productId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.status(500).json({ error: "DB no disponible" }); return; }
    const productId = parseInt(req.params.productId);

    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, req.user!.id), eq(favorites.productId, productId)));

    if (existing.length > 0) {
      await db.delete(favorites).where(eq(favorites.id, existing[0].id));
      res.json({ favorited: false, message: "Eliminado de favoritos" });
    } else {
      await db.insert(favorites).values({ userId: req.user!.id, productId });
      res.json({ favorited: true, message: "Agregado a favoritos" });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ error: "Error al actualizar favorito" });
  }
});

// GET /api/favorites/check/:productId
favoritesRouter.get("/check/:productId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ favorited: false }); return; }
    const productId = parseInt(req.params.productId);
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, req.user!.id), eq(favorites.productId, productId)));
    res.json({ favorited: existing.length > 0 });
  } catch (error) {
    res.json({ favorited: false });
  }
});
