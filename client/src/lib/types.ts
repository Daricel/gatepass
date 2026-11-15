export type Role = "organizer" | "attendee";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface GpEvent {
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

export type TicketStatus = "valid" | "checked_in" | "cancelled";

export interface Ticket {
  id: number;
  status: TicketStatus;
  qrPayload: string;
  createdAt: string;
  checkedInAt: string | null;
  event: Pick<GpEvent, "id" | "title" | "location" | "startsAt">;
}

export interface Attendee {
  ticketId: number;
  name: string;
  email: string;
  status: TicketStatus;
  registeredAt: string;
  checkedInAt: string | null;
}

export interface CheckInResult {
  ticketId: number;
  attendee: { name: string; email: string };
  checkedInAt: string;
}
