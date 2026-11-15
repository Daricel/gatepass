import { Router, type Request } from "express";
import { z } from "zod";
import type { DB } from "../db.js";
import { transaction } from "../db.js";
import { requireRole } from "../auth.js";
import { config } from "../config.js";
import { HttpError, forbidden, idParam, notFound, parse } from "../http.js";
import { liveHub } from "../live.js";
import { EVENT_SELECT, getEvent, getStats, type EventRow } from "../queries.js";
import { newTicketCode, toQrPayload, verifyQrPayload } from "../ticketCode.js";

const eventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(""),
  location: z.string().trim().min(1).max(200),
  startsAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s).toISOString()),
  capacity: z.number().int().min(1).max(100_000),
});

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  past: z.enum(["true", "false"]).optional(),
});

interface TicketLookup {
  id: number;
  eventId: number;
  status: "valid" | "checked_in" | "cancelled";
  checkedInAt: string | null;
  name: string;
  email: string;
}

export function eventsRouter(db: DB) {
  const router = Router();

  /** Loads an event and makes sure the current user organizes it. */
  function ownedEvent(req: Request): EventRow {
    const event = getEvent(db, parse(idParam, req.params.id));
    if (!event) throw notFound("Event");
    if (event.organizerId !== req.user!.id) throw forbidden();
    return event;
  }

  const TICKET_LOOKUP = `
    SELECT t.id, t.event_id AS eventId, t.status, t.checked_in_at AS checkedInAt, u.name, u.email
    FROM tickets t JOIN users u ON u.id = t.user_id`;
  const byCode = db.prepare(`${TICKET_LOOKUP} WHERE t.code = ?`);
  const byId = db.prepare(`${TICKET_LOOKUP} WHERE t.id = ?`);
  // Conditional update = atomic check-in. If two scanners read the same QR at once,
  // only one UPDATE matches status='valid'; the other sees changes === 0.
  const markCheckedIn = db.prepare(
    "UPDATE tickets SET status = 'checked_in', checked_in_at = ? WHERE id = ? AND status = 'valid'",
  );

  function checkIn(eventId: number, ticket: TicketLookup | undefined) {
    if (!ticket) throw new HttpError(404, "ticket_not_found", "No ticket with this code");
    if (ticket.eventId !== eventId) throw new HttpError(422, "wrong_event", "This ticket is for a different event");
    if (ticket.status === "cancelled") throw new HttpError(409, "ticket_cancelled", "This ticket was cancelled");

    const now = new Date().toISOString();
    const { changes } = markCheckedIn.run(now, ticket.id);
    if (changes === 0) {
      const current = byId.get(ticket.id) as unknown as TicketLookup;
      throw new HttpError(409, "already_checked_in", `${ticket.name} already checked in`, {
        checkedInAt: current.checkedInAt,
        attendee: { name: ticket.name },
      });
    }
    liveHub.publish(eventId, { ...getStats(db, eventId), lastCheckIn: { name: ticket.name, at: now } });
    return { ticketId: ticket.id, attendee: { name: ticket.name, email: ticket.email }, checkedInAt: now };
  }

  // ---- Public ---------------------------------------------------------------

  router.get("/", (req, res) => {
    const { q, past } = parse(listQuery, req.query);
    const now = new Date().toISOString();
    const where = [past === "true" ? "e.starts_at < ?" : "e.starts_at >= ?"];
    const params: string[] = [now];
    if (q) {
      where.push("(e.title LIKE ? OR e.location LIKE ? OR e.description LIKE ?)");
      const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
      params.push(like, like, like);
    }
    const order = past === "true" ? "DESC" : "ASC";
    const sql = `${EVENT_SELECT} WHERE ${where.join(" AND ")} ORDER BY e.starts_at ${order} LIMIT 100`;
    const events = db.prepare(sql.replaceAll("LIKE ?", "LIKE ? ESCAPE '\\'")).all(...params);
    res.json({ events });
  });

  // ---- Organizer ------------------------------------------------------------

  router.get("/mine", requireRole("organizer"), (req, res) => {
    const events = db.prepare(`${EVENT_SELECT} WHERE e.organizer_id = ? ORDER BY e.starts_at DESC`).all(req.user!.id);
    res.json({ events });
  });

  router.get("/:id", (req, res) => {
    const event = getEvent(db, parse(idParam, req.params.id));
    if (!event) throw notFound("Event");
    let myTicket = null;
    if (req.user) {
      myTicket =
        db
          .prepare("SELECT id, status FROM tickets WHERE event_id = ? AND user_id = ? AND status != 'cancelled'")
          .get(event.id, req.user.id) ?? null;
    }
    res.json({ event, myTicket });
  });

  router.post("/", requireRole("organizer"), (req, res) => {
    const input = parse(eventSchema, req.body);
    const { id } = db
      .prepare(
        "INSERT INTO events (organizer_id, title, description, location, starts_at, capacity) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      )
      .get(req.user!.id, input.title, input.description, input.location, input.startsAt, input.capacity) as {
      id: number;
    };
    res.status(201).json({ event: getEvent(db, id) });
  });

  router.put("/:id", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    const input = parse(eventSchema, req.body);
    if (input.capacity < event.registered) {
      throw new HttpError(
        422,
        "capacity_below_registered",
        `Capacity can't be lower than the ${event.registered} people already registered`,
      );
    }
    db.prepare(
      "UPDATE events SET title = ?, description = ?, location = ?, starts_at = ?, capacity = ? WHERE id = ?",
    ).run(input.title, input.description, input.location, input.startsAt, input.capacity, event.id);
    res.json({ event: getEvent(db, event.id) });
  });

  router.delete("/:id", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
    res.status(204).end();
  });

  router.get("/:id/attendees", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    const attendees = db
      .prepare(
        `SELECT t.id AS ticketId, u.name, u.email, t.status, t.created_at AS registeredAt, t.checked_in_at AS checkedInAt
         FROM tickets t JOIN users u ON u.id = t.user_id
         WHERE t.event_id = ? AND t.status != 'cancelled' ORDER BY u.name COLLATE NOCASE`,
      )
      .all(event.id);
    res.json({ attendees });
  });

  router.get("/:id/attendees.csv", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    const rows = db
      .prepare(
        `SELECT u.name, u.email, t.status, t.created_at AS registeredAt, COALESCE(t.checked_in_at, '') AS checkedInAt
         FROM tickets t JOIN users u ON u.id = t.user_id
         WHERE t.event_id = ? AND t.status != 'cancelled' ORDER BY u.name COLLATE NOCASE`,
      )
      .all(event.id) as Record<string, string>[];
    // Quote every cell and neutralise leading =+-@ to prevent CSV/formula injection in Excel.
    const cell = (v: string) => `"${String(v).replace(/^([=+\-@])/, "'$1").replaceAll('"', '""')}"`;
    const header = ["name", "email", "status", "registeredAt", "checkedInAt"];
    const csv = [header.join(","), ...rows.map((r) => header.map((h) => cell(r[h])).join(","))].join("\n");
    res.type("text/csv").attachment(`attendees-event-${event.id}.csv`).send(csv);
  });

  router.post("/:id/checkin", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    const { payload } = parse(z.object({ payload: z.string().max(200) }), req.body);
    const code = verifyQrPayload(payload, config.ticketSecret);
    if (!code) throw new HttpError(422, "invalid_ticket", "This QR code is not a valid Gatepass ticket");
    res.json(checkIn(event.id, byCode.get(code) as TicketLookup | undefined));
  });

  /** Manual fallback when a phone screen won't scan: check in from the attendee list. */
  router.post("/:id/attendees/:ticketId/checkin", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    const ticketId = parse(idParam, req.params.ticketId);
    res.json(checkIn(event.id, byId.get(ticketId) as TicketLookup | undefined));
  });

  /** Server-Sent Events stream of live attendance for the check-in screen. */
  router.get("/:id/live", requireRole("organizer"), (req, res) => {
    const event = ownedEvent(req);
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.flushHeaders();
    const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send(getStats(db, event.id));
    const unsubscribe = liveHub.subscribe(event.id, send);
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // ---- Attendee -------------------------------------------------------------

  router.post("/:id/tickets", requireRole("attendee"), (req, res) => {
    const eventId = parse(idParam, req.params.id);
    const ticket = transaction(db, () => {
      const event = getEvent(db, eventId);
      if (!event) throw notFound("Event");
      if (event.startsAt < new Date().toISOString()) {
        throw new HttpError(422, "event_started", "Registration is closed, this event already started");
      }
      const existing = db
        .prepare("SELECT id FROM tickets WHERE event_id = ? AND user_id = ? AND status != 'cancelled'")
        .get(eventId, req.user!.id);
      if (existing) throw new HttpError(409, "already_registered", "You already have a ticket for this event");
      if (event.registered >= event.capacity) throw new HttpError(409, "sold_out", "This event is full");

      const code = newTicketCode();
      return db
        .prepare("INSERT INTO tickets (event_id, user_id, code) VALUES (?, ?, ?) RETURNING id, status, code")
        .get(eventId, req.user!.id, code) as { id: number; status: string; code: string };
    });
    liveHub.publish(eventId, getStats(db, eventId));
    res.status(201).json({
      ticket: { id: ticket.id, status: ticket.status, qrPayload: toQrPayload(ticket.code, config.ticketSecret) },
    });
  });

  return router;
}
