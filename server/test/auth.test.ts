import { describe, expect, it } from "vitest";
import request from "supertest";
import { setup } from "./helpers.js";

describe("auth", () => {
  it("registers, keeps the session in an httpOnly cookie, and logs out", async () => {
    const { app } = setup();
    const agent = request.agent(app);
    const reg = await agent
      .post("/api/auth/register")
      .send({ email: "ana@test.dev", name: "Ana", password: "password123", role: "attendee" });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toEqual({ id: expect.any(Number), email: "ana@test.dev", name: "Ana", role: "attendee" });
    expect(reg.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    expect(reg.body.user.passwordHash).toBeUndefined();

    expect((await agent.get("/api/auth/me")).body.user.name).toBe("Ana");
    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/auth/me").expect(401);
  });

  it("rejects duplicate emails case-insensitively", async () => {
    const { anon } = setup();
    const body = { email: "dup@test.dev", name: "A", password: "password123", role: "attendee" };
    await anon().post("/api/auth/register").send(body).expect(201);
    const res = await anon().post("/api/auth/register").send({ ...body, email: "DUP@test.dev" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("email_taken");
  });

  it("validates input", async () => {
    const { anon } = setup();
    const res = await anon().post("/api/auth/register").send({ email: "nope", name: "", password: "short", role: "admin" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details).sort()).toEqual(["email", "name", "password", "role"]);
  });

  it("gives the same error for unknown email and wrong password", async () => {
    const { anon } = setup();
    await anon().post("/api/auth/register").send({ email: "x@test.dev", name: "X", password: "password123", role: "attendee" });
    const wrongPw = await anon().post("/api/auth/login").send({ email: "x@test.dev", password: "nope" });
    const noUser = await anon().post("/api/auth/login").send({ email: "ghost@test.dev", password: "nope" });
    expect(wrongPw.status).toBe(401);
    expect(noUser.body).toEqual(wrongPw.body);
  });

  it("ignores a tampered session cookie", async () => {
    const { anon } = setup();
    await anon().get("/api/auth/me").set("Cookie", "gp_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.").expect(401);
  });
});
