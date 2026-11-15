import type { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { HttpError } from "./http.js";

export type Role = "organizer" | "attendee";
export interface AuthUser {
  id: number;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const COOKIE = "gp_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setSession(res: Response, user: AuthUser) {
  const token = jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true, // not readable from JS -> safe from XSS token theft
    sameSite: "lax", // not sent on cross-site POSTs -> CSRF protection
    secure: config.isProd,
    maxAge: MAX_AGE_MS,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE);
}

/** Attaches req.user when a valid session cookie is present. Never rejects. */
export const loadUser: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      req.user = { id: Number(payload.sub), role: payload.role as Role };
    } catch {
      // expired or tampered token: treat as logged out
    }
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new HttpError(401, "unauthenticated", "Please log in");
  next();
};

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new HttpError(401, "unauthenticated", "Please log in");
    if (req.user.role !== role) throw new HttpError(403, "forbidden", `Only ${role}s can do this`);
    next();
  };
