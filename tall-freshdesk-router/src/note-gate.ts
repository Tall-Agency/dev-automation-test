import type { FreshdeskConversation } from "./types.ts";

/**
 * Whether a note_added webhook should start the implement phase.
 *
 * Freshdesk's Ticket Updates performer must be "Agent or requester" for
 * private notes to fire at all in this account, so requester notes can reach
 * the Worker. Cursor agents also post private notes, which would re-trigger
 * implement. Gate here: only a staff private note that is not from Cursor.
 */
export type NoteForwardDecision =
  | { forward: true; note: FreshdeskConversation }
  | {
      forward: false;
      reason:
        | "no_conversations"
        | "requester_note"
        | "public_note"
        | "cursor_note";
    };

const CURSOR_NOTE_MARKER = /via\s+Cursor/i;

function newestConversation(
  conversations: FreshdeskConversation[]
): FreshdeskConversation | null {
  if (conversations.length === 0) return null;

  return conversations.reduce((latest, c) => {
    const a = Date.parse(latest.created_at || "") || 0;
    const b = Date.parse(c.created_at || "") || 0;
    return b >= a ? c : latest;
  });
}

export function shouldForwardNoteAdded(
  conversations: FreshdeskConversation[]
): NoteForwardDecision {
  const note = newestConversation(conversations);
  if (!note) return { forward: false, reason: "no_conversations" };

  // Requester / portal notes. incoming is the Freshdesk flag for that.
  if (note.incoming) return { forward: false, reason: "requester_note" };

  if (note.private !== true) return { forward: false, reason: "public_note" };

  const body = `${note.body_text || ""}\n${note.body || ""}`;
  if (CURSOR_NOTE_MARKER.test(body)) {
    return { forward: false, reason: "cursor_note" };
  }

  return { forward: true, note };
}
