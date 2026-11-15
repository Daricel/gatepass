# Gatepass

**Event registration with QR tickets and live door check-in.**

Organizers publish events. Attendees register and get a QR ticket on their phone. At the entrance, the organizer scans tickets with any laptop or phone camera while a live attendance counter updates on every screen.

[![CI](https://github.com/Daricel/gatepass/actions/workflows/ci.yml/badge.svg)](https://github.com/Daricel/gatepass/actions/workflows/ci.yml)

<!-- Add screenshots after running locally: docs/events.png, docs/ticket.png, docs/checkin.png -->
| Browse events | QR ticket | Check-in screen |
|---|---|---|
| ![Events](docs/events.png) | ![Ticket](docs/ticket.png) | ![Check-in](docs/checkin.png) |

## Features

- **Accounts with roles**: organizers and attendees, sessions in an httpOnly cookie
- **Events**: create, edit, delete, search, capacity limits, upcoming / past views
- **QR tickets**: one per person per event, cancellable; signed with HMAC so they can't be forged
- **Camera check-in**: scan from the browser, with instant green / amber / red feedback, sound and vibration
- **Live dashboard**: Server-Sent Events push attendance to every open check-in screen (several doors, one counter)
- **Manual fallback**: search the attendee list and check someone in when their screen won't scan
- **CSV export** of attendees, safe against spreadsheet formula injection
- **Organizer stats**: registrations, fill rate, show-up rate for past events
- Responsive UI, works on a phone at the door

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript, React Router, Tailwind CSS, Vite |
| Backend | Node.js, Express 5, TypeScript, Zod validation |
| Database | SQLite (built-in `node:sqlite`), raw SQL with indexes and constraints |
| Auth & security | JWT in httpOnly + SameSite cookies, bcrypt, Helmet (CSP), rate limiting |
| Real-time | Server-Sent Events |
| Testing | Vitest + Supertest (integration tests against an in-memory DB) |
| DevOps | Docker (multi-stage, non-root), Docker Compose, GitHub Actions CI |

## Engineering decisions

**No overselling under concurrency.** Registration runs "count tickets → compare with capacity → insert" inside a `BEGIN IMMEDIATE` transaction, so two requests can't both take the last spot. A partial unique index (`event_id, user_id WHERE status != 'cancelled'`) guarantees one active ticket per person at the database level, even if application code had a bug.

**A ticket can be used only once, even with two scanners.** Check-in is a single conditional update:
```sql
UPDATE tickets SET status = 'checked_in', checked_in_at = ? WHERE id = ? AND status = 'valid'
```
If two doors scan the same QR at the same moment, only one update matches; the other gets `changes = 0` and shows *"Already checked in at 18:04"*. A test fires 5 simultaneous scans and asserts exactly one succeeds.

**Unforgeable QR codes.** A QR payload is `GP1.<random 128-bit code>.<HMAC-SHA256 signature>`. The server rejects a forged or mistyped code before touching the database (comparing signatures with `timingSafeEqual`), and the database lookup handles revocation (cancelled) and replay (already used).

**Security basics done properly.** Passwords are hashed with bcrypt. Logins give the same error for an unknown email and a wrong password (no account enumeration). The session cookie can't be read by JavaScript (`httpOnly`) and isn't sent on cross-site POSTs (`SameSite=Lax`). Every input is validated with Zod. The app refuses to start in production without real secrets. The login redirect only follows same-site paths (no open redirect).

**Why SSE instead of WebSockets?** Updates only flow server → browser, so SSE is enough: plain HTTP, automatic reconnect, no extra library. Pub/sub is in-process; running several server instances would swap it for Redis pub/sub without changing the API.

**Why SQLite?** Zero setup for anyone cloning the repo, and plenty for this workload. The SQL is standard and would port to PostgreSQL easily.

## Run it locally

Requires **Node.js 24+** (for the built-in `node:sqlite`).

```bash
npm install
npm run seed     # demo data
npm run dev      # API on :3000, web app on http://localhost:5173
```

Demo accounts (password `password123`):
- `organizer@demo.dev`: dashboard, create events, check-in screen
- `attendee@demo.dev`: register, see QR tickets

**Try the full flow:** log in as the attendee in one browser and open *My tickets*. Log in as the organizer in a private window, open *Dashboard → Check-in*, and point the camera at the QR code on the other screen or your phone. (No camera? Use "Copy code" on the ticket and "Paste a ticket code" on the check-in screen.)

### With Docker

```bash
cp .env.example .env   # then put random values in it: openssl rand -base64 32
docker compose up --build
# open http://localhost:3000
```

## Tests

```bash
npm test
```
20 integration tests cover auth, validation, permissions, capacity under concurrent registrations, double and simultaneous check-ins, forged / tampered QR codes, wrong-event tickets, cancellation and re-registration, and CSV injection.

## API overview

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | anyone | Account and session |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/events?q=&past=` | anyone | List and search events |
| GET | `/api/events/:id` | anyone | Event details (+ my ticket if logged in) |
| POST / PUT / DELETE | `/api/events[/:id]` | organizer (owner) | Manage events |
| GET | `/api/events/mine` | organizer | My events with stats |
| GET | `/api/events/:id/attendees[.csv]` | owner | Attendee list / CSV export |
| POST | `/api/events/:id/checkin` | owner | Check in by QR payload |
| POST | `/api/events/:id/attendees/:ticketId/checkin` | owner | Manual check-in |
| GET | `/api/events/:id/live` | owner | SSE stream of live stats |
| POST | `/api/events/:id/tickets` | attendee | Register, get a QR ticket |
| GET | `/api/tickets/mine` | attendee | My tickets |
| DELETE | `/api/tickets/:id` | ticket owner | Cancel a ticket |

Errors always have the shape `{ "error": { "code", "message", "details?" } }`.

## Project structure

```
server/
  src/
    app.ts            Express app (middleware, routes, static client)
    db.ts             Schema, indexes, transaction helper
    auth.ts           JWT cookie sessions, role guards
    ticketCode.ts     QR payload signing and verification
    live.ts           Pub/sub for Server-Sent Events
    routes/           auth, events, tickets
  test/               Integration tests
client/
  src/
    pages/            Events, event detail, tickets, dashboard, editor, check-in
    components/       UI kit, layout, QR scanner
    lib/              API client, auth context, hooks
```

## What I'd add next

- Email confirmations with the ticket attached
- Waitlist that promotes people automatically when someone cancels
- Offline check-in mode (sync scans when the connection returns)
- PostgreSQL and Redis for running multiple instances

## License

MIT © Daria Berciu
