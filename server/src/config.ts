const isProd = process.env.NODE_ENV === "production";

const jwtSecret = process.env.JWT_SECRET ?? (isProd ? undefined : "dev-jwt-secret-change-me");
const ticketSecret = process.env.TICKET_SECRET ?? (isProd ? undefined : "dev-ticket-secret-change-me");

if (!jwtSecret || !ticketSecret) {
  throw new Error("JWT_SECRET and TICKET_SECRET must be set in production");
}

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? "gatepass.db",
  jwtSecret,
  ticketSecret,
};
