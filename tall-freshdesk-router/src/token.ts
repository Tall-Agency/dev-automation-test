/**
 * Per-ticket action tokens.
 *
 * Agents used to need a copy of the Worker's action secret, which meant keeping
 * a value in sync across Cloudflare, cursor.com and .dev.vars. Any drift showed
 * up only as an opaque 401 from inside a cloud agent. Instead the Worker mints a
 * token bound to one ticket and hands it to the agent in the webhook payload, so
 * there is nothing to configure on the agent side and a leaked token is useless
 * for any other ticket once it expires.
 */

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent comparison, to avoid leaking a match via timing. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const DEFAULT_TOKEN_TTL_SECONDS = 86_400;

export async function mintActionToken(
  secret: string,
  ticketId: number,
  ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  const exp = nowSeconds + ttlSeconds;
  const body = `${ticketId}.${exp}`;
  return `${body}.${await hmacHex(secret, body)}`;
}

export type TokenCheck =
  | { ok: true; ticketId: number }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyActionToken(
  secret: string,
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<TokenCheck> {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [ticketPart, expPart, sig] = parts;
  const ticketId = Number(ticketPart);
  const exp = Number(expPart);
  if (!Number.isInteger(ticketId) || !Number.isInteger(exp)) {
    return { ok: false, reason: "malformed" };
  }

  const expected = await hmacHex(secret, `${ticketPart}.${expPart}`);
  if (!constantTimeEqual(sig, expected)) {
    return { ok: false, reason: "bad_signature" };
  }
  // Signature is checked before expiry so a tampered exp cannot buy extra time.
  if (exp <= nowSeconds) return { ok: false, reason: "expired" };

  return { ok: true, ticketId };
}
