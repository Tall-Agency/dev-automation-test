import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  mintActionToken,
  verifyActionToken,
} from "../src/token.ts";

const SECRET = "test-secret-value";

describe("action tokens", () => {
  it("round-trips and reports the ticket it is bound to", async () => {
    const token = await mintActionToken(SECRET, 263);
    const check = await verifyActionToken(SECRET, token);
    assert.deepEqual(check, { ok: true, ticketId: 263 });
  });

  it("rejects a token minted with a different secret", async () => {
    const token = await mintActionToken("other-secret", 263);
    const check = await verifyActionToken(SECRET, token);
    assert.deepEqual(check, { ok: false, reason: "bad_signature" });
  });

  it("rejects a token whose ticket id was edited", async () => {
    const token = await mintActionToken(SECRET, 263);
    const [, exp, sig] = token.split(".");
    const check = await verifyActionToken(SECRET, `999.${exp}.${sig}`);
    assert.deepEqual(check, { ok: false, reason: "bad_signature" });
  });

  it("rejects an expired token", async () => {
    const now = 1_000_000;
    const token = await mintActionToken(SECRET, 263, 60, now);
    const check = await verifyActionToken(SECRET, token, now + 61);
    assert.deepEqual(check, { ok: false, reason: "expired" });
  });

  it("does not let an edited expiry extend the token", async () => {
    const now = 1_000_000;
    const token = await mintActionToken(SECRET, 263, 60, now);
    const [ticket, , sig] = token.split(".");
    const check = await verifyActionToken(
      SECRET,
      `${ticket}.${now + 99_999}.${sig}`,
      now + 61
    );
    assert.deepEqual(check, { ok: false, reason: "bad_signature" });
  });

  it("rejects malformed input", async () => {
    for (const bad of ["", "nope", "1.2", "a.b.c"]) {
      const check = await verifyActionToken(SECRET, bad);
      assert.equal(check.ok, false);
    }
  });
});
