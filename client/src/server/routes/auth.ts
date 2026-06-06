import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import passport from "../lib/passport.js";
import { sendWelcomeEmail } from "../lib/mailer.js";

export const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Nombre, email y contraseña son requeridos" });
      return;
    }

    if (!db) {
      // Mock mode
      const token = jwt.sign(
        { id: 1, email, role: role || "user", name },
        process.env.JWT_SECRET || "default_secret_dev",
        { expiresIn: "7d" }
      );
      res.json({ token, user: { id: 1, name, email, role: role || "user" } });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      res.status(400).json({ error: "El email ya está registrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role: role || "user",
      })
      .returning();

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      process.env.JWT_SECRET || "default_secret_dev",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });

    // Send Welcome Email asynchronously
    sendWelcomeEmail(newUser.email, newUser.name);
  } catch (error: any) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña son requeridos" });
      return;
    }

    if (!db) {
      // Mock mode
      const token = jwt.sign(
        { id: 1, email, role: "user", name: "Anónimo" },
        process.env.JWT_SECRET || "default_secret_dev",
        { expiresIn: "7d" }
      );
      res.json({ token, user: { id: 1, name: "Anónimo", email, role: "user" } });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "default_secret_dev",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/auth/me
authRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!db) {
      res.json({ user: req.user });
      return;
    }

    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error("Error en /me:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/auth/google
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// GET /api/auth/google/callback
authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req: any, res) => {
    // Generate JWT for the authenticated user
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role, name: req.user.name },
      process.env.JWT_SECRET || "default_secret_dev",
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token in URL (simple approach) or cookie
    // Since it's a separate client/server, we can use a redirect with a search param 
    // or a specialized bridge page.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth-success?token=${token}`);
  }
);
