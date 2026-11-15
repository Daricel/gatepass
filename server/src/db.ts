import { DatabaseSync } from "node:sqlite";

export type DB = DatabaseSync;

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('organizer', 'attendee')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY,
  organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL,
  starts_at    TEXT NOT NULL,
  capacity     INTEGER NOT NULL CHECK (capacity > 0),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);

CREATE TABLE IF NOT EXISTS tickets (
  id            INTEGER PRIMARY KEY,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'checked_in', 'cancelled')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  checked_in_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id, status);
-- One active ticket per person per event; cancelled tickets don't block re-registering.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_one_active
  ON tickets(event_id, user_id) WHERE status != 'cancelled';
`;

export function openDb(path: string): DB {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}

/** Runs fn inside a write transaction. BEGIN IMMEDIATE takes the write lock up front,
 *  so two concurrent "check capacity then insert" sequences can't interleave. */
export function transaction<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
