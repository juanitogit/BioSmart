import { Router } from "express";
import { db } from "../db/index.js";
import { urbanFarms, users } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { cache } from "../lib/cache.js";

export const urbanFarmsRouter = Router();

// GET /api/urban-farms — todas las granjas públicas
urbanFarmsRouter.get("/", async (_req, res) => {
  try {
    const cacheKey = "urban_farms_public";
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      res.json({ farms: cachedData });
      return;
    }

    if (!db) { res.json({ farms: [] }); return; }

    const farms = await db
      .select({
        id: urbanFarms.id,
        name: urbanFarms.name,
        description: urbanFarms.description,
        lat: urbanFarms.lat,
        lng: urbanFarms.lng,
        city: urbanFarms.city,
        country: urbanFarms.country,
        farmType: urbanFarms.farmType,
        area: urbanFarms.area,
        createdAt: urbanFarms.createdAt,
        userId: urbanFarms.userId,
        ownerName: users.name,
        ownerAvatar: users.avatar,
      })
      .from(urbanFarms)
      .leftJoin(users, eq(urbanFarms.userId, users.id))
      .where(eq(urbanFarms.isPublic, true))
      .orderBy(desc(urbanFarms.createdAt));

    cache.set(cacheKey, farms, 60);
    res.json({ farms });
  } catch (error) {
    console.error("Error fetching farms:", error);
    res.json({ farms: [] });
  }
});

// GET /api/urban-farms/mine — mis granjas
urbanFarmsRouter.get("/mine", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) { res.json({ farms: [] }); return; }

    const farms = await db
      .select()
      .from(urbanFarms)
      .where(eq(urbanFarms.userId, req.user!.id))
      .orderBy(desc(urbanFarms.createdAt));

    res.json({ farms });
  } catch (error) {
    console.error("Error fetching my farms:", error);
    res.json({ farms: [] });
  }
});

// POST /api/urban-farms — registrar granja
urbanFarmsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, lat, lng, city, country, farmType, area, isPublic } = req.body;

    if (!name || !lat || !lng) {
      res.status(400).json({ error: "Nombre y coordenadas son requeridos" });
      return;
    }

    if (!db) { res.status(503).json({ error: "DB no disponible" }); return; }

    const [farm] = await db.insert(urbanFarms).values({
      userId: req.user!.id,
      name,
      description: description || null,
      lat: String(lat),
      lng: String(lng),
      city: city || null,
      country: country || null,
      farmType: farmType || "hidroponía",
      area: area ? String(area) : null,
      isPublic: isPublic !== false,
    }).returning();

    res.json({ farm, message: "Granja registrada exitosamente" });
  } catch (error) {
    console.error("Error creating farm:", error);
    res.status(500).json({ error: "Error al registrar granja" });
  }
});

// PUT /api/urban-farms/:id — editar granja
urbanFarmsRouter.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const farmId = parseInt(req.params.id as string);
    const { name, description, city, country, farmType, area, isPublic } = req.body;

    if (!db) { res.json({ message: "Actualizado" }); return; }

    const [existing] = await db.select().from(urbanFarms).where(eq(urbanFarms.id, farmId));
    if (!existing || (existing.userId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const [updated] = await db.update(urbanFarms)
      .set({ name, description, city, country, farmType, area: area ? String(area) : null, isPublic })
      .where(eq(urbanFarms.id, farmId))
      .returning();

    res.json({ farm: updated, message: "Granja actualizada" });
  } catch (error) {
    console.error("Error updating farm:", error);
    res.status(500).json({ error: "Error al actualizar granja" });
  }
});

// DELETE /api/urban-farms/:id
urbanFarmsRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const farmId = parseInt(req.params.id as string);
    if (!db) { res.json({ message: "Eliminado" }); return; }

    const [existing] = await db.select().from(urbanFarms).where(eq(urbanFarms.id, farmId));
    if (!existing || (existing.userId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    await db.delete(urbanFarms).where(eq(urbanFarms.id, farmId));
    res.json({ message: "Granja eliminada" });
  } catch (error) {
    console.error("Error deleting farm:", error);
    res.status(500).json({ error: "Error al eliminar granja" });
  }
});
