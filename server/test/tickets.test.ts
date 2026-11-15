import { describe, expect, it } from "vitest";
import { setup } from "./helpers.js";

describe("registration and check-in", () => {
  it("issues a QR ticket and checks it in exactly once", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const attendee = await user("attendee", "Ioana");
    const event = await createEvent(org);

    const reg = await attendee.post(`/api/events/${event.id}/tickets`).expect(201);
    const { qrPayload } = reg.body.ticket;
    expect(qrPayload).toMatch(/^GP1\.[\w-]+\.[\w-]+$/);

    const first = await org.post(`/api/events/${event.id}/checkin`).send({ payload: qrPayload });
    expect(first.status).toBe(200);
    expect(first.body.attendee.name).toBe("Ioana");

    const second = await org.post(`/api/events/${event.id}/checkin`).send({ payload: qrPayload });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("already_checked_in");
    expect(second.body.error.details.checkedInAt).toBe(first.body.checkedInAt);
  });

  it("handles simultaneous scans of the same ticket: one success, one rejection", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const event = await createEvent(org);
    const { qrPayload } = (await (await user("attendee")).post(`/api/events/${event.id}/tickets`)).body.ticket;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => org.post(`/api/events/${event.id}/checkin`).send({ payload: qrPayload })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409, 409]);
  });

  it("rejects forged and tampered QR codes", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const event = await createEvent(org);
    const { qrPayload } = (await (await user("attendee")).post(`/api/events/${event.id}/tickets`)).body.ticket;
    const [prefix, code, sig] = qrPayload.split(".");

    for (const payload of [`${prefix}.${code}.${"A".repeat(sig.length)}`, `${prefix}.AAAAAAAAAAAAAAAAAAAAAA.${sig}`, "hello", ""]) {
      const res = await org.post(`/api/events/${event.id}/checkin`).send({ payload });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("invalid_ticket");
    }
  });

  it("rejects a valid ticket scanned at the wrong event", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const a = await createEvent(org, { title: "A event" });
    const b = await createEvent(org, { title: "B event" });
    const { qrPayload } = (await (await user("attendee")).post(`/api/events/${a.id}/tickets`)).body.ticket;
    const res = await org.post(`/api/events/${b.id}/checkin`).send({ payload: qrPayload });
    expect(res.body.error.code).toBe("wrong_event");
  });

  it("enforces capacity even under concurrent registrations", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const event = await createEvent(org, { capacity: 3 });
    const attendees = await Promise.all(Array.from({ length: 8 }, () => user("attendee")));
    const results = await Promise.all(attendees.map((a) => a.post(`/api/events/${event.id}/tickets`)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.body.error?.code === "sold_out")).toHaveLength(5);
  });

  it("prevents double registration, but allows it again after cancelling", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const attendee = await user("attendee");
    const event = await createEvent(org);
    const first = await attendee.post(`/api/events/${event.id}/tickets`).expect(201);
    const dup = await attendee.post(`/api/events/${event.id}/tickets`);
    expect(dup.body.error.code).toBe("already_registered");

    await attendee.delete(`/api/tickets/${first.body.ticket.id}`).expect(204);
    const cancelledScan = await org.post(`/api/events/${event.id}/checkin`).send({ payload: first.body.ticket.qrPayload });
    expect(cancelledScan.body.error.code).toBe("ticket_cancelled");
    await attendee.post(`/api/events/${event.id}/tickets`).expect(201);
  });

  it("closes registration once the event has started", async () => {
    const { user, createEvent, inDays } = setup();
    const org = await user("organizer");
    const event = await createEvent(org, { startsAt: inDays(-1) });
    const res = await (await user("attendee")).post(`/api/events/${event.id}/tickets`);
    expect(res.body.error.code).toBe("event_started");
  });

  it("users can only see and cancel their own tickets", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const alice = await user("attendee");
    const bob = await user("attendee");
    const event = await createEvent(org);
    const ticket = (await alice.post(`/api/events/${event.id}/tickets`)).body.ticket;

    expect((await alice.get("/api/tickets/mine")).body.tickets).toHaveLength(1);
    expect((await bob.get("/api/tickets/mine")).body.tickets).toHaveLength(0);
    await bob.delete(`/api/tickets/${ticket.id}`).expect(403);
  });

  it("supports manual check-in from the attendee list", async () => {
    const { user, createEvent } = setup();
    const org = await user("organizer");
    const event = await createEvent(org);
    const ticket = (await (await user("attendee")).post(`/api/events/${event.id}/tickets`)).body.ticket;
    await org.post(`/api/events/${event.id}/attendees/${ticket.id}/checkin`).expect(200);
    const list = await org.get(`/api/events/${event.id}/attendees`);
    expect(list.body.attendees[0].status).toBe("checked_in");
    const ev = await org.get(`/api/events/${event.id}`);
    expect(ev.body.event).toMatchObject({ registered: 1, checkedIn: 1 });
  });
});
