import { Router } from "express";
import { db } from "../db/index.js";
import { plans, subscriptions, donations } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { sendEmail, emailTemplates } from "../lib/email.js";
import { users } from "../db/schema.js";

export const plansRouter = Router();

// Default plans data
const defaultPlans = [
  {
    id: 1,
    name: "Raíz Solidaria",
    slug: "raiz_solidaria",
    description: "Acceso a herramientas básicas para empezar tu camino en la agricultura urbana sostenible.",
    priceMonthly: "0",
    priceAnnual: "0",
    trialDays: 0,
    features: JSON.stringify([
      "Acceso a herramientas básicas",
      "Sección educativa completa",
      "Acceso al marketplace",
    ]),
    hasChatbot: false,
    hasAiSuggestions: false,
    hasDetailedStats: false,
    isActive: true,
  },
  {
    id: 2,
    name: "Desarrollo Rural",
    slug: "desarrollo_rural",
    description: "Potencia tu producción con IA y estadísticas detalladas de ventas.",
    priceMonthly: "2",
    priceAnnual: "20",
    trialDays: 90,
    features: JSON.stringify([
      "Todo lo de Raíz Solidaria",
      "Chatbot con IA",
      "Estadísticas de ventas detalladas",
      "Soporte prioritario",
    ]),
    hasChatbot: true,
    hasAiSuggestions: false,
    hasDetailedStats: true,
    isActive: true,
  },
  {
    id: 3,
    name: "Impacto Global",
    slug: "impacto_global",
    description: "Maximiza tu impacto con sugerencias automáticas de IA y reportes avanzados.",
    priceMonthly: "4",
    priceAnnual: "40",
    trialDays: 90,
    features: JSON.stringify([
      "Todo lo de Desarrollo Rural",
      "Sugerencias automáticas con IA",
      "Envío de sugerencias por email",
      "Reportes avanzados de impacto",
      "Acceso anticipado a nuevas funciones",
    ]),
    hasChatbot: true,
    hasAiSuggestions: true,
    hasDetailedStats: true,
    isActive: true,
  },
];

// GET /api/plans - List all plans
plansRouter.get("/", async (_req, res) => {
  try {
    if (!db) {
      res.json({ plans: defaultPlans });
      return;
    }
    const allPlans = await db.select().from(plans);
    if (allPlans.length === 0) {
      res.json({ plans: defaultPlans });
      return;
    }
    res.json({ plans: allPlans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.json({ plans: defaultPlans });
  }
});

// POST /api/plans/subscribe
plansRouter.post("/subscribe", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const userId = req.user!.id;

    if (!planId || !billingCycle) {
      res.status(400).json({ error: "Plan y ciclo de facturación requeridos" });
      return;
    }

    const plan = defaultPlans.find((p) => p.id === planId);
    if (!plan) {
      res.status(404).json({ error: "Plan no encontrado" });
      return;
    }

    const amount = billingCycle === "annual"
      ? parseFloat(plan.priceAnnual)
      : parseFloat(plan.priceMonthly);

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const trialEnd = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

    if (!db) {
      const subscription = {
        id: 1,
        userId,
        planId,
        billingCycle,
        status: trialEnd ? "trial" : "active",
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amountPaid: amount.toString(),
        createdAt: now,
      };

      // 30% donation calculation
      const donationAmount = amount * 0.3;

      res.json({
        subscription,
        donation: donationAmount > 0 ? { amount: donationAmount, source: "plan_purchase" } : null,
        message: `Suscripción a ${plan.name} creada exitosamente`,
      });
      return;
    }

    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        billingCycle: billingCycle as "monthly" | "annual",
        status: trialEnd ? "trial" : "active",
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amountPaid: amount.toString(),
      })
      .returning();

    // Create donation (30% of plan price)
    if (amount > 0) {
      await db.insert(donations).values({
        userId,
        subscriptionId: sub.id,
        amount: (amount * 0.3).toFixed(2),
        source: "plan_purchase",
      });
    }

    // Send welcome email
    if (req.user) {
      sendEmail(
        req.user.email,
        `Bienvenido a ${plan.name}`,
        emailTemplates.subscriptionSuccess(req.user.name, plan.name)
      ).catch(err => console.error("Error asíncrono email:", err));
    }

    res.json({
      subscription: sub,
      message: `Suscripción a ${plan.name} creada exitosamente`,
    });
  } catch (error: any) {
    console.error("Error subscribing:", error);
    res.status(500).json({ error: "Error al crear suscripción" });
  }
});

// GET /api/plans/my-subscription
plansRouter.get("/my-subscription", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) {
      res.json({ subscription: null });
      return;
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, req.user!.id),
          eq(subscriptions.status, "active")
        )
      );

    res.json({ subscription: sub || null });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.json({ subscription: null });
  }
});
