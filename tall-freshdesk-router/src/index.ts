import { forwardToCursor, normalizeToken, webhookForPhase } from "./cursor.ts";
import { mintActionToken, verifyActionToken } from "./token.ts";
import {
  createPrivateNote,
  fetchConversations,
  fetchTicket,
  getCustomField,
  loadRegistry,
  updateTicket,
  type TicketUpdate,
} from "./freshdesk.ts";
import { eventToPhase, resolveSiteAndRepo } from "./registry.ts";
import type {
  EnrichedCursorPayload,
  Env,
  IncomingEvent,
} from "./types.ts";

interface IncomingBody {
  ticket_id?: number | string;
  event?: string;
  ticket?: { id?: number | string };
}

interface NoteActionBody {
  ticket_id?: number | string;
  body?: string;
}

interface UpdateActionBody {
  ticket_id?: number | string;
  status?: number;
  priority?: number;
  tags?: string[];
  responder_id?: number | null;
  custom_fields?: Record<string, string | number | boolean | null>;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseTicketId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseEvent(body: IncomingBody): IncomingEvent | null {
  const event = body.event;
  if (
    event === "ticket_created" ||
    event === "note_added" ||
    event === "ticket_reopened"
  ) {
    return event;
  }
  return null;
}

/**
 * Secret backing both the shared action secret and per-ticket token signing.
 * Trimmed because these values are pasted by hand between three places, and a
 * trailing newline is invisible but fails as a flat 401.
 */
function actionSecret(env: Env): string {
  return (
    env.ROUTER_ACTION_SECRET ||
    env.CURSOR_WEBHOOK_SECRET ||
    env.WEBHOOK_SHARED_SECRET ||
    ""
  ).trim();
}

/** Presented credential, from either header style. */
function presentedCredential(request: Request): string {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return (
    request.headers.get("X-Tall-Action-Secret") ||
    request.headers.get("X-Tall-Webhook-Secret") ||
    ""
  ).trim();
}

/**
 * Authorize a write against one ticket. Accepts the per-ticket action token from
 * the webhook payload, or the shared secret for manual calls.
 */
async function authorizeTicketAction(
  request: Request,
  env: Env,
  ticketId: number
): Promise<Response | null> {
  const secret = actionSecret(env);
  if (!secret) {
    return json({ error: "missing_env", need: ["ROUTER_ACTION_SECRET"] }, 500);
  }

  const presented = presentedCredential(request);
  if (!presented) return json({ error: "unauthorized" }, 401);
  if (presented === secret) return null;

  const check = await verifyActionToken(secret, presented);
  if (check.ok && check.ticketId === ticketId) return null;

  return json(
    {
      error: "unauthorized",
      detail: check.ok
        ? "action token is for a different ticket"
        : `action token ${check.reason}`,
      hint: "Use worker.action_token from the webhook payload for this ticket.",
    },
    401
  );
}

/** Auth for endpoints with no ticket context, e.g. /diag. */
function requireActionAuth(request: Request, env: Env): Response | null {
  const secret = actionSecret(env);
  if (!secret) {
    return json(
      {
        error: "missing_env",
        need: ["ROUTER_ACTION_SECRET"],
      },
      500
    );
  }

  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = (
    request.headers.get("X-Tall-Webhook-Secret") ||
    request.headers.get("X-Tall-Action-Secret") ||
    ""
  ).trim();

  if (bearer !== secret && headerSecret !== secret) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

function requireInboundWebhookAuth(
  request: Request,
  env: Env
): Response | null {
  if (!env.WEBHOOK_SHARED_SECRET) return null;
  const provided = (
    request.headers.get("X-Tall-Webhook-Secret") ||
    request.headers.get("X-Webhook-Secret") ||
    ""
  ).trim();
  if (provided !== env.WEBHOOK_SHARED_SECRET.trim()) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

async function handleWebhook(
  request: Request,
  env: Env,
  dryRun: boolean
): Promise<Response> {
  const inboundAuth = requireInboundWebhookAuth(request, env);
  if (inboundAuth) return inboundAuth;

  let body: IncomingBody;
  try {
    body = (await request.json()) as IncomingBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const ticketId = parseTicketId(body.ticket_id ?? body.ticket?.id);
  const event = parseEvent(body);
  if (!ticketId) {
    return json({ error: "ticket_id required" }, 400);
  }
  if (!event) {
    return json(
      {
        error: "event required",
        allowed: ["ticket_created", "note_added", "ticket_reopened"],
      },
      400
    );
  }

  const phase = eventToPhase(event);
  if (!phase) {
    return json({ error: "unknown_event", event }, 400);
  }

  if (!env.FRESHDESK_API_KEY || !env.FRESHDESK_DOMAIN) {
    return json(
      { error: "missing_env", need: ["FRESHDESK_API_KEY", "FRESHDESK_DOMAIN"] },
      500
    );
  }

  const registry = await loadRegistry(env);
  const ticket = await fetchTicket(env, ticketId);
  const conversations = await fetchConversations(env, ticketId);
  const websiteUrl = getCustomField(
    ticket,
    registry.freshdesk_fields.website_url
  );
  const repoField = getCustomField(ticket, registry.freshdesk_fields.repo);

  const resolved = resolveSiteAndRepo(registry, websiteUrl, repoField);
  if (!resolved.ok) {
    if (dryRun) {
      return json(
        {
          routed: false,
          dry_run: true,
          reason: resolved.code,
          message: resolved.message,
          website_url: websiteUrl,
          repo_field: repoField,
        },
        422
      );
    }

    const noteBody = [
      "Cursor routing could not process this ticket.",
      "",
      resolved.message,
      "",
      `(via Cursor — router)`,
    ].join("\n");

    try {
      await createPrivateNote(env, ticketId, noteBody);
    } catch (err) {
      return json(
        {
          routed: false,
          reason: resolved.code,
          message: resolved.message,
          note_error: String(err),
        },
        422
      );
    }

    return json(
      {
        routed: false,
        reason: resolved.code,
        message: resolved.message,
        private_note: true,
      },
      422
    );
  }

  const origin = new URL(request.url).origin;
  const payload: EnrichedCursorPayload = {
    phase,
    event,
    io_mode: "worker",
    freshdesk: {
      ticket_id: ticketId,
      website_url: resolved.websiteUrl,
      repo: resolved.repo.github,
      subject: ticket.subject,
      status: ticket.status,
      tags: ticket.tags,
      description_text: ticket.description_text || ticket.description,
      custom_fields: ticket.custom_fields,
      conversations,
    },
    site: {
      slug: resolved.site.slug,
      staging_url: resolved.site.staging_url,
      bugherd_project_id: resolved.site.bugherd_project_id ?? null,
    },
    repo: {
      github: resolved.repo.github,
      default_branch: resolved.repo.default_branch,
      theme_path: resolved.repo.theme_path,
    },
    worker: {
      actions_base_url: `${origin}/actions`,
      note_path: "/actions/note",
      update_ticket_path: "/actions/update-ticket",
      auth: "Authorization: Bearer <action_token>",
      action_token: await mintActionToken(actionSecret(env), ticketId),
    },
  };

  const webhookUrl = webhookForPhase(resolved.repo, phase);

  if (dryRun) {
    return json({
      routed: true,
      dry_run: true,
      phase,
      event,
      ticket_id: ticketId,
      github: resolved.repo.github,
      auto_selected_repo: resolved.autoSelectedRepo,
      website_url: resolved.websiteUrl,
      subject: ticket.subject,
      status: ticket.status,
      tags: ticket.tags,
      description_preview: (payload.freshdesk.description_text || "").slice(
        0,
        600
      ),
      conversations: conversations.map((c) => ({
        private: c.private,
        incoming: c.incoming,
        body_preview: (c.body_text || "").slice(0, 300),
      })),
    });
  }

  try {
    const result = await forwardToCursor(env, webhookUrl, payload);
    return json({
      routed: true,
      phase,
      ticket_id: ticketId,
      github: resolved.repo.github,
      auto_selected_repo: resolved.autoSelectedRepo,
      conversation_count: conversations.length,
      cursor_status: result.status,
      cursor_body: result.body.slice(0, 500),
    });
  } catch (err) {
    return json(
      {
        routed: false,
        reason: "cursor_forward_failed",
        message: String(err),
        payload_summary: {
          ticket_id: ticketId,
          phase,
          github: resolved.repo.github,
        },
      },
      502
    );
  }
}

async function handleNoteAction(
  request: Request,
  env: Env
): Promise<Response> {
  let body: NoteActionBody;
  try {
    body = (await request.json()) as NoteActionBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const ticketId = parseTicketId(body.ticket_id);
  const noteBody = (body.body || "").trim();
  if (!ticketId || !noteBody) {
    return json({ error: "ticket_id and body required" }, 400);
  }

  const authErr = await authorizeTicketAction(request, env, ticketId);
  if (authErr) return authErr;

  const result = await createPrivateNote(env, ticketId, noteBody);
  return json({ ok: true, ticket_id: ticketId, result });
}

async function handleUpdateTicketAction(
  request: Request,
  env: Env
): Promise<Response> {
  let body: UpdateActionBody;
  try {
    body = (await request.json()) as UpdateActionBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const ticketId = parseTicketId(body.ticket_id);
  if (!ticketId) {
    return json({ error: "ticket_id required" }, 400);
  }

  const authErr = await authorizeTicketAction(request, env, ticketId);
  if (authErr) return authErr;

  const update: TicketUpdate = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.priority !== undefined) update.priority = body.priority;
  if (body.tags !== undefined) update.tags = body.tags;
  if (body.responder_id !== undefined) update.responder_id = body.responder_id;
  if (body.custom_fields !== undefined) update.custom_fields = body.custom_fields;

  if (Object.keys(update).length === 0) {
    return json({ error: "no update fields provided" }, 400);
  }

  const result = await updateTicket(env, ticketId, update);
  return json({ ok: true, ticket_id: ticketId, result });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "tall-freshdesk-router",
        io_mode: "worker",
      });
    }

    // Which secrets the Worker can actually see. Presence only, never values.
    if (request.method === "GET" && url.pathname === "/diag") {
      const authErr = requireActionAuth(request, env);
      if (authErr) return authErr;

      // Shape only - enough to spot a pasted "Bearer " prefix or a truncated
      // token without disclosing the value itself.
      const shape = (raw: string | undefined) => {
        if (!raw) return { set: false };
        const token = normalizeToken(raw);
        return {
          set: true,
          had_prefix: token !== raw.trim(),
          looks_like_cursor_token: Boolean(token?.startsWith("crsr_")),
          length: token?.length ?? 0,
        };
      };

      const plan = normalizeToken(env.CURSOR_TOKEN_PLAN);
      const impl = normalizeToken(env.CURSOR_TOKEN_IMPLEMENT);
      const nudge = normalizeToken(env.CURSOR_TOKEN_REOPENED_NUDGE);
      const action = normalizeToken(env.ROUTER_ACTION_SECRET);

      return json({
        freshdesk_api_key: Boolean(env.FRESHDESK_API_KEY),
        freshdesk_domain: env.FRESHDESK_DOMAIN || null,
        cursor_token_plan: shape(env.CURSOR_TOKEN_PLAN),
        cursor_token_implement: shape(env.CURSOR_TOKEN_IMPLEMENT),
        cursor_token_reopened_nudge: shape(env.CURSOR_TOKEN_REOPENED_NUDGE),
        router_action_secret: Boolean(env.ROUTER_ACTION_SECRET),
        legacy_cursor_webhook_secret: Boolean(env.CURSOR_WEBHOOK_SECRET),
        webhook_shared_secret: Boolean(env.WEBHOOK_SHARED_SECRET),
        // Equality only. Catches one value pasted into several slots.
        mistakes: {
          all_three_tokens_identical:
            Boolean(plan) && plan === impl && impl === nudge,
          plan_equals_action_secret: Boolean(plan) && plan === action,
          implement_equals_action_secret: Boolean(impl) && impl === action,
          nudge_equals_action_secret: Boolean(nudge) && nudge === action,
          plan_equals_legacy:
            Boolean(plan) && plan === normalizeToken(env.CURSOR_WEBHOOK_SECRET),
        },
      });
    }

    try {
      if (
        request.method === "POST" &&
        (url.pathname === "/" || url.pathname === "/webhook")
      ) {
        const dryRun = ["1", "true", "yes"].includes(
          (url.searchParams.get("dry_run") || "").toLowerCase()
        );
        return await handleWebhook(request, env, dryRun);
      }

      if (request.method === "POST" && url.pathname === "/actions/note") {
        return await handleNoteAction(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/actions/update-ticket"
      ) {
        return await handleUpdateTicketAction(request, env);
      }
    } catch (err) {
      return json({ error: "internal", message: String(err) }, 500);
    }

    return json({ error: "not_found" }, 404);
  },
};
