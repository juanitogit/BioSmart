import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env only in local dev — Vercel injects env vars automatically
try {
  dotenv.config({ path: path.join(__dirname, "../../../.env") });
  dotenv.config({ path: path.join(process.cwd(), ".env") });
} catch (_) {
  // Ignore if .env doesn't exist (Vercel)
}

import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { plansRouter } from "./routes/plans.js";
import { productsRouter } from "./routes/products.js";
import { donationsRouter } from "./routes/donations.js";
import { aiRouter } from "./routes/ai.js";
import { adminRouter } from "./routes/admin.js";
import { usersRouter } from "./routes/users.js";
import { cropIntelRouter } from "./routes/crop-intel.js";
import { urbanFarmsRouter } from "./routes/urban-farms.js";
import passport from "./lib/passport.js";

const app = express();

// Trust Vercel's reverse proxy (needed for OAuth callback URLs)
app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/plans", plansRouter);
app.use("/api/products", productsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);
app.use("/api/crop-intel", cropIntelRouter);
app.use("/api/urban-farms", urbanFarmsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
