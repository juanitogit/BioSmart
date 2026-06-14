import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { db } from "../db/index.js";
import { subscriptions, plans } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export function checkPlanMiddleware(requiredFeatures: ("chatbot" | "aiSuggestions")[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      if (!db) {
        // En modo mock, permitimos todo por ahora o simulamos
        return next();
      }

      const [sub] = await db
        .select({
          hasChatbot: plans.hasChatbot,
          hasAiSuggestions: plans.hasAiSuggestions,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(
          and(
            eq(subscriptions.userId, req.user.id),
            eq(subscriptions.status, "active")
          )
        );

      if (!sub) {
        res.status(403).json({ error: "No tienes un plan activo para acceder a esta función" });
        return;
      }

      if (requiredFeatures.includes("chatbot") && !sub.hasChatbot) {
        res.status(403).json({ error: "Tu plan no incluye el Chatbot con IA" });
        return;
      }

      if (requiredFeatures.includes("aiSuggestions") && !sub.hasAiSuggestions) {
        res.status(403).json({ error: "Tu plan no incluye Sugerencias con IA" });
        return;
      }

      next();
    } catch (error) {
      console.error("Error en checkPlanMiddleware:", error);
      res.status(500).json({ error: "Error al verificar el plan" });
    }
  };
}
