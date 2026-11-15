import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { openDb } from "./db.js";
import { newTicketCode } from "./ticketCode.js";

/** Resets the database with demo accounts and events, for local dev and live demos. */
const db = openDb(config.databasePath);
db.exec("DELETE FROM tickets; DELETE FROM events; DELETE FROM users;");

const hash = bcrypt.hashSync("password123", 10);
const addUser = db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id");
const organizer = addUser.get("organizer@demo.dev", "Ana Organizer", hash, "organizer") as { id: number };
const attendee = addUser.get("attendee@demo.dev", "Andrei Attendee", hash, "attendee") as { id: number };

const firstNames = ["Maria", "Ioana", "Alex", "Mihai", "Elena", "Radu", "Cristina", "Vlad", "Diana", "Paul", "Irina", "Tudor"];
const lastNames = ["Popescu", "Ionescu", "Stan", "Dumitru", "Marin", "Georgescu"];
const crowd = firstNames.flatMap((f, i) => {
  const l = lastNames[i % lastNames.length];
  return [(addUser.get(`${f.toLowerCase()}.${l.toLowerCase()}@demo.dev`, `${f} ${l}`, hash, "attendee") as { id: number }).id];
});

const day = 24 * 60 * 60 * 1000;
const at = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const addEvent = db.prepare(
  "INSERT INTO events (organizer_id, title, description, location, starts_at, capacity) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
);
const events = [
  ["Frontend Meetup: React Server Components", "Talks and pizza. Two speakers, Q&A, networking afterwards.", "Hub Cowork, Cluj-Napoca", at(3, 18), 40],
  ["Intro to Docker Workshop", "Hands-on workshop. Bring a laptop with Docker installed.", "Faculty of Automation, Room 301", at(7, 10), 25],
  ["Student Hackathon 2026", "24 hours, teams of 3-4, prizes for the top 3 projects.", "Impact Hub, Bucharest", at(14, 9), 120],
  ["Career Fair: Tech Internships", "Meet 20+ companies hiring interns.", "Student Cultural Center", at(21, 11), 300],
  ["Algorithms Study Group", "Weekly practice for coding interviews.", "Central Library, Floor 2", at(1, 17), 12],
  ["Last Month's Python Night", "A past event, kept for history.", "Online", at(-20, 19), 50],
] as const;

const addTicket = db.prepare("INSERT INTO tickets (event_id, user_id, code, status, checked_in_at) VALUES (?, ?, ?, ?, ?)");
for (const [i, [title, description, location, startsAt, capacity]] of events.entries()) {
  const { id } = addEvent.get(organizer.id, title, description, location, startsAt, capacity) as { id: number };
  const people = i === 4 ? crowd.slice(0, 12) : crowd.slice(0, 3 + ((i * 3) % crowd.length));
  for (const [j, userId] of people.entries()) {
    const checkedIn = i === 5 && j % 3 !== 0;
    addTicket.run(id, userId, newTicketCode(), checkedIn ? "checked_in" : "valid", checkedIn ? startsAt : null);
  }
  if (i < 3) addTicket.run(id, attendee.id, newTicketCode(), "valid", null);
}

console.log("Seeded demo data. Log in with:");
console.log("  organizer@demo.dev / password123");
console.log("  attendee@demo.dev  / password123");
