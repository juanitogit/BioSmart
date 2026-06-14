import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const usersRouter = Router();

// GET /api/users/profile
usersRouter.get("/profile", authMiddleware, async (req: AuthRequest, res) => {
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
    
    res.json({ user: user || req.user });
  } catch (error) {
    console.error("Error:", error);
    res.json({ user: req.user });
  }
});
