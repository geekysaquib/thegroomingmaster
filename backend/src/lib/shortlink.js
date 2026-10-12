import crypto from "node:crypto";

// Short, signed, stateless invoice links: base64url( uuid[16] + expiryDay[2] + hmac[9] ) = 36 chars, e.g. https://site/i/<36 chars>.
// No database row needed; the HMAC (keyed with JWT_SECRET) makes codes unguessable and the expiry day is part of what is signed.
const DAY_MS = 86400000;
const sign = (payload) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(payload).digest().subarray(0, 9);

export function makeInvoiceCode(invoiceId, days = 30) {
  const payload = Buffer.alloc(18);
  Buffer.from(invoiceId.replace(/-/g, ""), "hex").copy(payload, 0);
  payload.writeUInt16BE(Math.floor(Date.now() / DAY_MS) + days, 16);
  return Buffer.concat([payload, sign(payload)]).toString("base64url");
}

/** Returns { id } for a valid code, { expired: true } for a valid but old one, or null. */
export function readInvoiceCode(code) {
  const buf = Buffer.from(String(code || ""), "base64url");
  if (buf.length !== 27) return null;
  const payload = buf.subarray(0, 18), sig = buf.subarray(18);
  if (!crypto.timingSafeEqual(sig, sign(payload))) return null;
  if (payload.readUInt16BE(16) < Math.floor(Date.now() / DAY_MS)) return { expired: true };
  const h = payload.subarray(0, 16).toString("hex");
  return { id: `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` };
}
