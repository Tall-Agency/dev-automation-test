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

/** Private note only - never use /reply. */
export async function createPrivateNote(
  env: Env,
  ticketId: number,
  body: string
): Promise<unknown> {
  const url = `${apiBase(env)}/tickets/${ticketId}/notes`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(env),
    body: JSON.stringify({
      body,
      private: true,
    }),
  });

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
