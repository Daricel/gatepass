import request from "supertest";
import { createApp } from "../src/app.js";
import { openDb } from "../src/db.js";

export function setup() {
  const db = openDb(":memory:");
  const app = createApp({ db, authRateLimit: 1000 });
  let n = 0;

  /** Registers a fresh user and returns a cookie-carrying agent. */
  async function user(role: "organizer" | "attendee", name = `${role} ${++n}`) {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/register")
      .send({ email: `${role}${n}-${Math.random().toString(36).slice(2)}@test.dev`, name, password: "password123", role });
    if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
    return agent;
  }

  const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

  async function createEvent(organizer: request.Agent, overrides: Record<string, unknown> = {}) {
    const res = await organizer.post("/api/events").send({
      title: "Test Event",
      location: "Room 1",
      startsAt: inDays(5),
      capacity: 10,
      ...overrides,
    });
    if (res.status !== 201) throw new Error(`create event failed: ${JSON.stringify(res.body)}`);
    return res.body.event as { id: number };
  }

  return { app, db, user, createEvent, inDays, anon: () => request(app) };
}
