import type { DB } from "./db.js";
import type { LiveStats } from "./live.js";

export interface EventRow {
  id: number;
  organizerId: number;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  capacity: number;
  registered: number;
  checkedIn: number;
}

export const EVENT_SELECT = `
  SELECT e.id, e.organizer_id AS organizerId, u.name AS organizerName, e.title, e.description,
         e.location, e.starts_at AS startsAt, e.capacity,
         (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id AND t.status != 'cancelled') AS registered,
         (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id AND t.status = 'checked_in') AS checkedIn
  FROM events e JOIN users u ON u.id = e.organizer_id`;

export function getEvent(db: DB, id: number): EventRow | undefined {
  return db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).get(id) as EventRow | undefined;
}

export function getStats(db: DB, eventId: number): LiveStats {
  return db
    .prepare(
      `SELECT COUNT(*) FILTER (WHERE status != 'cancelled') AS registered,
              COUNT(*) FILTER (WHERE status = 'checked_in') AS checkedIn
       FROM tickets WHERE event_id = ?`,
    )
    .get(eventId) as unknown as LiveStats;
}
