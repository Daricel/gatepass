import { Router } from "express";
import type { DB } from "../db.js";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";
import { HttpError, forbidden, idParam, notFound, parse } from "../http.js";
import { liveHub } from "../live.js";
import { getStats } from "../queries.js";
import { toQrPayload } from "../ticketCode.js";

export function ticketsRouter(db: DB) {
  const router = Router();
  router.use(requireAuth);

  router.get("/mine", (req, res) => {
    const rows = db
      .prepare(
        `SELECT t.id, t.status, t.code, t.created_at AS createdAt, t.checked_in_at AS checkedInAt,
                e.id AS eventId, e.title, e.location, e.starts_at AS startsAt
         FROM tickets t JOIN events e ON e.id = t.event_id
         WHERE t.user_id = ? AND t.status != 'cancelled'
         ORDER BY e.starts_at ASC`,
      )
      .all(req.user!.id) as Array<Record<string, unknown> & { code: string }>;

    const tickets = rows.map(({ code, eventId, title, location, startsAt, ...t }) => ({
      ...t,
      qrPayload: toQrPayload(code, config.ticketSecret),
      event: { id: eventId, title, location, startsAt },
    }));
    res.json({ tickets });
  });

  router.delete("/:id", (req, res) => {
    const id = parse(idParam, req.params.id);
    const ticket = db.prepare("SELECT user_id AS userId, event_id AS eventId, status FROM tickets WHERE id = ?").get(id) as
      | { userId: number; eventId: number; status: string }
      | undefined;
    if (!ticket || ticket.status === "cancelled") throw notFound("Ticket");
    if (ticket.userId !== req.user!.id) throw forbidden();
    if (ticket.status === "checked_in") {
      throw new HttpError(409, "already_checked_in", "You can't cancel a ticket that was already used");
    }
    db.prepare("UPDATE tickets SET status = 'cancelled' WHERE id = ?").run(id);
    liveHub.publish(ticket.eventId, getStats(db, ticket.eventId));
    res.status(204).end();
  });

  return router;
}
