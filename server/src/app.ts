import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { existsSync } from "node:fs";
import path from "node:path";
import type { DB } from "./db.js";
import { loadUser } from "./auth.js";
import { apiNotFound, errorHandler } from "./http.js";
import { authRouter } from "./routes/auth.js";
import { eventsRouter } from "./routes/events.js";
import { ticketsRouter } from "./routes/tickets.js";

interface AppOptions {
  db: DB;
  /** Directory with the built React app, served in production. */
  clientDir?: string;
  authRateLimit?: number;
}

export function createApp({ db, clientDir, authRateLimit = 30 }: AppOptions) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { "img-src": ["'self'", "data:"], "worker-src": ["'self'", "blob:"] },
      },
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use(loadUser);

  // Brute-force protection on credential endpoints.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: authRateLimit, standardHeaders: "draft-8", legacyHeaders: false });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth", authRouter(db));
  app.use("/api/events", eventsRouter(db));
  app.use("/api/tickets", ticketsRouter(db));
  app.use("/api", apiNotFound);

  if (clientDir && existsSync(clientDir)) {
    app.use(express.static(clientDir, { maxAge: "1h", index: false }));
    // SPA fallback: let React Router handle any non-API path.
    app.get("/{*splat}", (_req, res) => res.sendFile(path.join(clientDir, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
