import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, plans, subscriptions, sales, donations, aiUsage, chatHistory, services } from "../db/schema.js";
import { eq, desc, sql, count, sum } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

export const adminRouter = Router();

// Apply auth + admin middleware to all routes
adminRouter.use(authMiddleware as any);
adminRouter.use(adminMiddleware as any);

// ============ STATS ============

adminRouter.get("/stats", async (_req, res) => {
  try {
    if (!db) {
      res.json({
        totalUsers: 0, totalRevenue: "0", totalSales: 0, totalAiUsage: 0,
        usersByPlan: [], revenueByMonth: [], platformGrowth: [], salesByVendor: [],
      });
      return;
    }

    const [userCount] = await db.select({ count: count() }).from(users);
    const [revenueResult] = await db.select({ total: sum(subscriptions.amountPaid) }).from(subscriptions);
    const [salesCount] = await db.select({ count: count() }).from(sales);
    const [aiCount] = await db.select({ count: count() }).from(aiUsage);
    const [chatCount] = await db.select({ count: count() }).from(chatHistory);
    const [donationCount] = await db.select({ count: count() }).from(donations);
    const [productCount] = await db.select({ count: count() }).from(products);

    // Get real users by role
    const usersByRole = await db.select({ role: users.role, count: count() }).from(users).groupBy(users.role);

    // Build usersByPlan from subscriptions data
    let usersByPlan: any[] = [];
    try {
      const planData = await db
        .select({ plan: plans.name, count: count() })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .groupBy(plans.name);
      usersByPlan = planData.length > 0 ? planData : [
        { plan: "Sin plan", count: userCount.count },
      ];
    } catch { usersByPlan = [{ plan: "Sin plan", count: userCount.count }]; }

    res.json({
      totalUsers: userCount.count,
      totalRevenue: revenueResult.total || "0",
      totalSales: salesCount.count,
      totalAiUsage: (aiCount.count || 0) + (chatCount.count || 0),
      totalDonations: donationCount.count,
      totalProducts: productCount.count,
      usersByRole,
      usersByPlan,
      revenueByMonth: [
        { month: "Ene", revenue: 0 },
        { month: "Feb", revenue: 0 },
        { month: "Mar", revenue: 0 },
        { month: "Abr", revenue: parseFloat(revenueResult.total || "0") },
      ],
      platformGrowth: [
        { month: "Abr", users: userCount.count },
      ],
      salesByVendor: [],
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// ============ USERS CRUD ============

adminRouter.get("/users", async (_req, res) => {
  try {
    if (!db) { res.json({ users: [] }); return; }
    const allUsers = await db.select({
      id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    res.json({ users: allUsers });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error" });
  }
});

adminRouter.post("/users", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!db) {
      res.json({ user: { id: Date.now(), name, email, role }, message: "Usuario creado" });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ name, email, password: hashedPassword, role }).returning();
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, message: "Usuario creado" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

adminRouter.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, planId } = req.body;
    if (!db) {
      res.json({ user: { id, name, email, role }, message: "Usuario actualizado" });
      return;
    }
    
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    
    // Attempt to update plan if a new planId is provided
    if (planId) {
       const existingSubs = await db.select().from(subscriptions).where(eq(subscriptions.userId, id));
       if (existingSubs.length > 0) {
         await db.update(subscriptions).set({ planId }).where(eq(subscriptions.userId, id));
       } else {
         await db.insert(subscriptions).values({ userId: id, planId, billingCycle: "monthly", status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
       }
    }
    
    res.json({ user, message: "Usuario y suscripción actualizados correctamente" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

adminRouter.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!db) { res.json({ message: "Usuario eliminado" }); return; }
    await db.delete(users).where(eq(users.id, id));
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

// ============ PRODUCTS CRUD ============

adminRouter.get("/products", async (_req, res) => {
  try {
    if (!db) { res.json({ products: [] }); return; }
    const all = await db.select().from(products).orderBy(desc(products.createdAt));
    res.json({ products: all });
  } catch (error) { res.status(500).json({ error: "Error" }); }
});

adminRouter.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!db) { res.json({ message: "Eliminado" }); return; }
    await db.delete(products).where(eq(products.id, id));
    res.json({ message: "Producto eliminado" });
  } catch (error) { res.status(500).json({ error: "Error" }); }
});

// ============ SERVICES CRUD ============

adminRouter.get("/services", async (_req, res) => {
  try {
    if (!db) { res.json({ services: [] }); return; }
    const all = await db.select().from(services).orderBy(desc(services.createdAt));
    res.json({ services: all });
  } catch (error) { res.json({ services: [] }); }
});

adminRouter.post("/services", async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!db) { res.json({ service: { id: Date.now(), name, description, category, isActive: true, usageCount: 0 } }); return; }
    const [service] = await db.insert(services).values({ name, description, category }).returning();
    res.json({ service, message: "Servicio creado" });
  } catch (error) { res.status(500).json({ error: "Error" }); }
});

adminRouter.put("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, category, isActive } = req.body;
    if (!db) { res.json({ service: { id, ...req.body } }); return; }
    const [service] = await db.update(services).set({ name, description, category, isActive }).where(eq(services.id, id)).returning();
    res.json({ service, message: "Servicio actualizado" });
  } catch (error) { res.status(500).json({ error: "Error" }); }
});

adminRouter.delete("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!db) { res.json({ message: "Eliminado" }); return; }
    await db.delete(services).where(eq(services.id, id));
    res.json({ message: "Servicio eliminado" });
  } catch(error) { res.status(500).json({ error: "Error" }); }
});

// ============ REVENUE ANALYTICS ============

adminRouter.get("/revenue/by-user", async (_req, res) => {
  try {
    if (!db) { res.json({ data: [] }); return; }
    const data = await db
      .select({
        userId: subscriptions.userId,
        totalPaid: sum(subscriptions.amountPaid),
      })
      .from(subscriptions)
      .groupBy(subscriptions.userId);
    res.json({ data });
  } catch (error) { res.json({ data: [] }); }
});

adminRouter.get("/revenue/by-plan", async (_req, res) => {
  try {
    if (!db) { res.json({ data: [] }); return; }
    const data = await db
      .select({
        planId: subscriptions.planId,
        revenue: sum(subscriptions.amountPaid),
        subscribers: count(),
      })
      .from(subscriptions)
      .groupBy(subscriptions.planId);
    res.json({ data });
  } catch (error) { res.json({ data: [] }); }
});
