import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { DB } from "../db.js";
import { clearSession, requireAuth, setSession, type Role } from "../auth.js";
import { HttpError, parse } from "../http.js";

const registerSchema = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: z.enum(["organizer", "attendee"]),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

const publicUser = ({ id, email, name, role }: UserRow) => ({ id, email, name, role });

export function authRouter(db: DB) {
  const router = Router();
  const findByEmail = db.prepare(
    "SELECT id, email, name, role, password_hash AS passwordHash FROM users WHERE email = ?",
  );
  const findById = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?");
  const insertUser = db.prepare(
    "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id, email, name, role",
  );

  router.post("/register", async (req, res) => {
    const input = parse(registerSchema, req.body);
    if (findByEmail.get(input.email)) {
      throw new HttpError(409, "email_taken", "An account with this email already exists");
    }
    const hash = await bcrypt.hash(input.password, 10);
    const user = insertUser.get(input.email, input.name, hash, input.role) as unknown as UserRow;
    setSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  router.post("/login", async (req, res) => {
    const input = parse(loginSchema, req.body);
    const user = findByEmail.get(input.email) as UserRow | undefined;
    // Same error for "no such user" and "wrong password" so emails can't be enumerated.
    const ok = user && (await bcrypt.compare(input.password, user.passwordHash));
    if (!user || !ok) throw new HttpError(401, "invalid_credentials", "Wrong email or password");
    setSession(res, user);
    res.json({ user: publicUser(user) });
  });

  router.post("/logout", (_req, res) => {
    clearSession(res);
    res.status(204).end();
  });

  router.get("/me", requireAuth, (req, res) => {
    const user = findById.get(req.user!.id);
    if (!user) {
      clearSession(res);
      throw new HttpError(401, "unauthenticated", "Please log in");
    }
    res.json({ user });
  });

  return router;
}
