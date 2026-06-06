import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        name: string;
      };
    }
  }
}

export type AuthRequest = Request;

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || "default_secret_dev";
    const decoded = jwt.verify(token, secret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Acceso denegado. Solo administradores." });
    return;
  }
  next();
}

export function sellerMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (
    !req.user ||
    (req.user.role !== "seller" && req.user.role !== "admin")
  ) {
    res.status(403).json({ error: "Acceso denegado. Solo vendedores." });
    return;
  }
  next();
}
