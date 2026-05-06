import { Router } from "express";
import { db } from "../db/index.js";
import { donations, users } from "../db/schema.js";
import { desc, sum, eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { sendEmail } from "../services/email.js";
import jwt from "jsonwebtoken";

export const donationsRouter = Router();

// Mock donation data
const mockDonations = [
  { id: 1, userId: 1, amount: "0.60", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 30), userName: "Sebastián R." },
  { id: 2, userId: 2, amount: "1.20", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 25), userName: "Aria S." },
  { id: 3, userId: 3, amount: "0.60", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 20), userName: "Omar H." },
  { id: 4, userId: 1, amount: "0.60", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 15), userName: "Sebastián R." },
  { id: 5, userId: 4, amount: "1.20", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 10), userName: "Isabella V." },
  { id: 6, userId: 2, amount: "1.20", source: "plan_purchase", createdAt: new Date(Date.now() - 86400000 * 5), userName: "Aria S." },
  { id: 7, userId: 5, amount: "0.60", source: "plan_purchase", createdAt: new Date(), userName: "Lucas M." },
];

// GET /api/donations
donationsRouter.get("/", async (_req, res) => {
  try {
    if (!db) {
      const total = mockDonations.reduce((s, d) => s + parseFloat(d.amount), 0);
      const byMonth = [
        { month: "Ene", amount: 1.80 },
        { month: "Feb", amount: 2.40 },
        { month: "Mar", amount: 3.00 },
        { month: "Abr", amount: 2.40 },
      ];
      res.json({
        totalDonated: total.toFixed(2),
        donationsCount: mockDonations.length,
        byMonth,
        recentDonations: mockDonations.slice(-5).reverse(),
      });
      return;
    }

    const totalResult = await db.select({ total: sum(donations.amount) }).from(donations);
    const total = totalResult[0]?.total || "0";

    const recentDonationsData = await db
      .select({
        id: donations.id,
        userId: donations.userId,
        amount: donations.amount,
        source: donations.source,
        message: donations.message,
        city: donations.city,
        country: donations.country,
        lat: donations.lat,
        lng: donations.lng,
        color: donations.color,
        emoji: donations.emoji,
        createdAt: donations.createdAt,
        userName: users.name,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .orderBy(desc(donations.createdAt))
      .limit(20);

    const recentDonations = recentDonationsData;

    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${donations.createdAt}, 'Mon')`,
        amount: sum(donations.amount),
      })
      .from(donations)
      .groupBy(sql`TO_CHAR(${donations.createdAt}, 'Mon'), EXTRACT(MONTH FROM ${donations.createdAt})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${donations.createdAt})`);

    res.json({
      totalDonated: total,
      donationsCount: recentDonations.length,
      byMonth: monthlyData,
      recentDonations,
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    res.json({ totalDonated: "0", donationsCount: 0, byMonth: [], recentDonations: [] });
  }
});

// GET /api/donations/history
donationsRouter.get("/history", authMiddleware, async (_req, res) => {
  try {
    if (!db) {
      res.json({ donations: mockDonations });
      return;
    }
    const allDonations = await db.select().from(donations).orderBy(desc(donations.createdAt));
    res.json({ donations: allDonations });
  } catch (error) {
    console.error("Error fetching donation history:", error);
    res.json({ donations: [] });
  }
});

// POST /api/donations
donationsRouter.post("/", async (req, res) => {
  try {
    const { amount, lat: bodyLat, lng: bodyLng } = req.body;
    if (!amount || isNaN(amount)) {
      res.status(400).json({ error: "Cantidad inválida" });
      return;
    }

    if (!db) {
      res.json({ message: "Donación simulada exitosamente" });
      return;
    }

    let currentUserId = 1; // Default "Anónimo" 
    const token = req.headers.authorization?.split(" ")[1];
    
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || "default_secret_dev";
        const decoded = jwt.verify(token, secret) as any;
        if (decoded && decoded.id) {
          currentUserId = decoded.id;
        }
      } catch (err) {
        console.warn("Token parsing error during donation:", err);
      }
    }

    // Default coordinates or user provided coordinates
    const isRealLocation = bodyLat != null && bodyLng != null;
    const lat = isRealLocation ? Number(bodyLat) : null;
    const lng = isRealLocation ? Number(bodyLng) : null;

    let finalCity = "Ubicación web";
    let finalCountry = "Global";

    if (isRealLocation) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${bodyLat}&lon=${bodyLng}&zoom=10`, {
          headers: { "User-Agent": "BioSmart-App/1.0" }
        });
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson && geoJson.address) {
            finalCity = geoJson.address.city || geoJson.address.town || geoJson.address.state || finalCity;
            finalCountry = geoJson.address.country || finalCountry;
          }
        }
      } catch (err) {
        console.warn("Geocoding failed:", err);
      }
    } else {
      // Si no es real, que quede nulo para que globe.html le asigne el nombre aleatorio correcto
      finalCity = "Desconocida";
      finalCountry = "Global";
    }

    await db.insert(donations).values({
      userId: currentUserId,
      amount: amount.toString(),
      source: "direct",
      message: "Aporte directo desde el Dashboard",
      city: finalCity,
      country: finalCountry,
      lat,
      lng,
      color: "#00f2fe",
      emoji: "📍",
    });

    res.json({ message: "¡Gracias por tu donación!" });
  } catch (error) {
    console.error("Error procesando donación:", error);
    res.status(500).json({ error: "Error al procesar la donación" });
  }
});

// POST /api/donations/subscribe
donationsRouter.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email es requerido" });
      return;
    }

    // Send confirmation email
    await sendEmail({
      to: email,
      subject: "🔔 Notificaciones Activadas - BioSmart",
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1a; color: #e5e7eb; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #16a34a, #0ea5e9); padding: 40px 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🌱 ¡Notificaciones Activadas!</h1>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; line-height: 1.6;">Hola,</p>
            <p style="font-size: 16px; line-height: 1.6;">Has activado exitosamente las notificaciones de <strong>BioSmart</strong> para el correo ${email}.</p>
            <div style="background: #111827; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1f2937;">
              <p style="font-size: 15px; color: #9ca3af; margin: 0;">A partir de ahora recibirás reportes de impacto, avisos tecnológicos y novedades de tu plataforma de agricultura inteligente.</p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Gracias por unirte a nuestra comunidad. 🌍</p>
          </div>
        </div>
      `,
    });

    res.json({ message: "Notificaciones activadas. Revisa tu email." });
  } catch (error) {
    console.error("Error al suscribir:", error);
    res.status(500).json({ error: "Error interno al suscribir" });
  }
});
