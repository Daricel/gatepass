import { describe, expect, it } from "vitest";
import { setup } from "./helpers.js";

describe("events", () => {
  it("only organizers can create events", async () => {
    const { user, anon } = setup();
    const attendee = await user("attendee");
    await anon().post("/api/events").send({}).expect(401);
    await attendee.post("/api/events").send({}).expect(403);
  });

  it("lists upcoming events with search, hides past ones", async () => {
    const { user, createEvent, inDays, anon } = setup();
    const org = await user("organizer");
    await createEvent(org, { title: "React Meetup" });
    await createEvent(org, { title: "Docker Workshop" });
    await createEvent(org, { title: "Old Event", startsAt: inDays(-3) });

    const all = await anon().get("/api/events");
    expect(all.body.events.map((e: { title: string }) => e.title)).toEqual(["React Meetup", "Docker Workshop"]);
    const search = await anon().get("/api/events?q=docker");
    expect(search.body.events).toHaveLength(1);
    const past = await anon().get("/api/events?past=true");
    expect(past.body.events[0].title).toBe("Old Event");
  });

  it("treats % in search as a literal character", async () => {
    const { user, createEvent, anon } = setup();
    const org = await user("organizer");
    await createEvent(org, { title: "Normal" });
    expect((await anon().get("/api/events?q=%25")).body.events).toHaveLength(0);
  });

  it("organizers can't edit or see attendees of someone else's event", async () => {
    const { user, createEvent } = setup();
    const owner = await user("organizer");
    const other = await user("organizer");
    const event = await createEvent(owner);
    await other.get(`/api/events/${event.id}/attendees`).expect(403);
    await other.delete(`/api/events/${event.id}`).expect(403);
  });

  it("won't lower capacity below the number of registrations", async () => {
    const { user, createEvent, inDays } = setup();
    const org = await user("organizer");
    const event = await createEvent(org, { capacity: 5 });
    for (let i = 0; i < 3; i++) await (await user("attendee")).post(`/api/events/${event.id}/tickets`).expect(201);
    const res = await org
      .put(`/api/events/${event.id}`)
      .send({ title: "Test Event", location: "Room 1", startsAt: inDays(5), capacity: 2 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("capacity_below_registered");
  });

  it("exports attendees as CSV with formula injection neutralised", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const event = await createEvent(org);
    await (await user("attendee", "=HYPERLINK(\"evil\")")).post(`/api/events/${event.id}/tickets`).expect(201);
    const res = await org.get(`/api/events/${event.id}/attendees.csv`).expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain(`"'=HYPERLINK(""evil"")"`);
  });
});
