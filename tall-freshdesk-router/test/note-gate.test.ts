import { strict as assert } from "node:assert";
import { test } from "node:test";

import { shouldForwardNoteAdded } from "../src/note-gate.ts";
import type { FreshdeskConversation } from "../src/types.ts";

function note(
  partial: Partial<FreshdeskConversation> & { id: number }
): FreshdeskConversation {
  return {
    body_text: "ok",
    private: true,
    incoming: false,
    created_at: "2026-09-10T10:00:00Z",
    ...partial,
  };
}

test("forwards a staff private note", () => {
  const d = shouldForwardNoteAdded([
    note({ id: 1, body_text: "Approved, go ahead." }),
  ]);
  assert.equal(d.forward, true);
});

test("skips requester notes", () => {
  const d = shouldForwardNoteAdded([
    note({ id: 1, incoming: true, body_text: "please fix" }),
  ]);
  assert.deepEqual(d, { forward: false, reason: "requester_note" });
});

test("skips public notes", () => {
  const d = shouldForwardNoteAdded([
    note({ id: 1, private: false, body_text: "public" }),
  ]);
  assert.deepEqual(d, { forward: false, reason: "public_note" });
});

test("skips Cursor agent notes, so they cannot re-trigger implement", () => {
  const d = shouldForwardNoteAdded([
    note({
      id: 1,
      body_text: "Plan ready\n\n(via Cursor — plan)",
    }),
  ]);
  assert.deepEqual(d, { forward: false, reason: "cursor_note" });
});

test("uses the newest note, not an older Cursor plan", () => {
  const d = shouldForwardNoteAdded([
    note({
      id: 1,
      created_at: "2026-09-10T09:00:00Z",
      body_text: "(via Cursor — plan)",
    }),
    note({
      id: 2,
      created_at: "2026-09-10T10:00:00Z",
      body_text: "Approved.",
    }),
  ]);
  assert.equal(d.forward, true);
});

test("skips when the newest note is from Cursor even if an older one approved", () => {
  const d = shouldForwardNoteAdded([
    note({
      id: 1,
      created_at: "2026-09-10T09:00:00Z",
      body_text: "Approved.",
    }),
    note({
      id: 2,
      created_at: "2026-09-10T10:00:00Z",
      body_text: "Implemented (via Cursor — implement)",
    }),
  ]);
  assert.deepEqual(d, { forward: false, reason: "cursor_note" });
});

test("skips when there are no conversations", () => {
  assert.deepEqual(shouldForwardNoteAdded([]), {
    forward: false,
    reason: "no_conversations",
  });
});
