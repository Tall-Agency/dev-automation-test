import type {
  Env,
  FreshdeskConversation,
  FreshdeskTicket,
  SiteRegistry,
} from "./types.ts";
import bundledRegistry from "../site-registry.json" with { type: "json" };

export async function loadRegistry(env: Env): Promise<SiteRegistry> {
  if (env.SITE_REGISTRY) {
    const fromKv = await env.SITE_REGISTRY.get("site-registry", "json");
    if (fromKv && typeof fromKv === "object") {
      return fromKv as SiteRegistry;
    }
  }
  return bundledRegistry as SiteRegistry;
}

function apiBase(env: Env): string {
  const domain = env.FRESHDESK_DOMAIN.replace(/^https?:\/\//, "").replace(
    /\/$/,
    ""
  );
  return `https://${domain}/api/v2`;
}

function basicAuthHeader(apiKey: string): string {
  const token = btoa(`${apiKey}:X`);
  return `Basic ${token}`;
}

function authHeaders(env: Env): Record<string, string> {
  return {
    Authorization: basicAuthHeader(env.FRESHDESK_API_KEY),
    "Content-Type": "application/json",
  };
}

export function getCustomField(
  ticket: FreshdeskTicket,
  fieldKey: string
): string | null {
  const value = ticket.custom_fields?.[fieldKey];
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export async function fetchTicket(
  env: Env,
  ticketId: number
): Promise<FreshdeskTicket> {
  const url = `${apiBase(env)}/tickets/${ticketId}`;
  const res = await fetch(url, { headers: authHeaders(env) });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Freshdesk GET ticket ${ticketId} failed: ${res.status} ${body}`);
  }

  return (await res.json()) as FreshdeskTicket;
}

/** Conversations include private notes and public replies. */
export async function fetchConversations(
  env: Env,
  ticketId: number
): Promise<FreshdeskConversation[]> {
  const url = `${apiBase(env)}/tickets/${ticketId}/conversations`;
  const res = await fetch(url, { headers: authHeaders(env) });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Freshdesk GET conversations ${ticketId} failed: ${res.status} ${body}`
    );
  }

  return (await res.json()) as FreshdeskConversation[];
}

/**
 * Freshdesk automation rules, for checking what the admin UI actually saved.
 * Type 1 is "Ticket Creation", 3 is "Ticket Updates".
 */
export async function fetchAutomationRules(
  env: Env,
  typeId: number
): Promise<unknown> {
  const url = `${apiBase(env)}/automations/${typeId}/rules`;
  const res = await fetch(url, { headers: authHeaders(env) });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Freshdesk GET automation rules ${typeId} failed: ${res.status} ${body}`
    );
  }

  return res.json();
}

export interface NoteAttachment {
  /** Original filename, e.g. staging-275.png */
  filename: string;
  /** Raw file bytes as base64 (standard, not data-URL). */
  content_base64: string;
  /** Defaults to application/octet-stream */
  content_type?: string;
}

function decodeBase64(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Private note only - never use /reply. Optional file attachments via multipart. */
export async function createPrivateNote(
  env: Env,
  ticketId: number,
  body: string,
  attachments: NoteAttachment[] = []
): Promise<unknown> {
  const url = `${apiBase(env)}/tickets/${ticketId}/notes`;

  let res: Response;
  if (attachments.length === 0) {
    res = await fetch(url, {
      method: "POST",
      headers: authHeaders(env),
      body: JSON.stringify({
        body,
        private: true,
      }),
    });
  } else {
    const form = new FormData();
    form.append("body", body);
    form.append("private", "true");
    for (const file of attachments) {
      const bytes = decodeBase64(file.content_base64);
      const type = file.content_type || "application/octet-stream";
      const copy = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
      form.append(
        "attachments[]",
        new Blob([copy], { type }),
        file.filename || "attachment.bin"
      );
    }
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(env.FRESHDESK_API_KEY),
        // Let fetch set multipart boundary - do not set Content-Type.
      },
      body: form,
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Freshdesk create note on ticket ${ticketId} failed: ${res.status} ${text}`
    );
  }

  return res.json().catch(() => ({ ok: true }));
}

export interface TicketUpdate {
  status?: number;
  priority?: number;
  tags?: string[];
  responder_id?: number | null;
  custom_fields?: Record<string, string | number | boolean | null>;
}

export async function updateTicket(
  env: Env,
  ticketId: number,
  update: TicketUpdate
): Promise<unknown> {
  const url = `${apiBase(env)}/tickets/${ticketId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders(env),
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Freshdesk update ticket ${ticketId} failed: ${res.status} ${text}`
    );
  }

  return res.json().catch(() => ({ ok: true }));
}
