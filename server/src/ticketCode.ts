import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A QR ticket payload looks like:  GP1.<code>.<signature>
 *  - code: 128 random bits, the ticket's lookup key in the DB
 *  - signature: HMAC-SHA256(code) with a server secret
 *
 * The signature lets the scanner reject forged / mistyped codes before touching the DB,
 * and the DB lookup handles revocation (cancelled) and replay (already checked in).
 */
const PREFIX = "GP1";

export function newTicketCode(): string {
  return randomBytes(16).toString("base64url");
}

function sign(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("base64url").slice(0, 22);
}

export function toQrPayload(code: string, secret: string): string {
  return `${PREFIX}.${code}.${sign(code, secret)}`;
}

/** Returns the ticket code if the payload is authentic, otherwise null. */
export function verifyQrPayload(payload: string, secret: string): string | null {
  const parts = payload.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, code, signature] = parts;
  const expected = Buffer.from(sign(code, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return code;
}
