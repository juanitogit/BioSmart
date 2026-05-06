import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { plansRouter } from "./routes/plans.js";
import { productsRouter } from "./routes/products.js";
import { donationsRouter } from "./routes/donations.js";
import { aiRouter } from "./routes/ai.js";
import { adminRouter } from "./routes/admin.js";
import { usersRouter } from "./routes/users.js";
import { cropIntelRouter } from "./routes/crop-intel.js";
import passport from "./lib/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Servir archivos estáticos del cliente
const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/plans", plansRouter);
app.use("/api/products", productsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);
app.use("/api/crop-intel", cropIntelRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA fallback: servir index.html para rutas no encontradas
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

export default app;
