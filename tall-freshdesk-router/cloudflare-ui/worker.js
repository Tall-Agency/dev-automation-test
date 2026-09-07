// src/cursor.ts
async function forwardToCursor(env, webhookUrl, payload) {
  if (!webhookUrl || webhookUrl.includes("REPLACE_WITH_")) {
    throw new Error(
      `Cursor webhook URL is not configured for phase ${payload.phase} / repo ${payload.repo.github}`
    );
  }
  const headers = {
    "Content-Type": "application/json"
  };
  if (env.CURSOR_WEBHOOK_SECRET) {
    headers.Authorization = `Bearer ${env.CURSOR_WEBHOOK_SECRET}`;
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const body = await res.text();
  return { status: res.status, body };
}
function webhookForPhase(repo, phase) {
  return repo.cursor_webhooks[phase];
}

// site-registry.json
var site_registry_default = {
  freshdesk_fields: {
    website_url: "cf_website_url",
    repo: "cf_repo",
    note: "Confirm exact cf_* keys via GET /api/v2/ticket_fields in Freshdesk Admin. Display names are Website URL and Repo."
  },
  sites: {
    "https://talldevstg.wpenginepowered.com": {
      slug: "tall-dev",
      staging_url: "https://talldevstg.wpenginepowered.com",
      bugherd_project_id: "527751",
      repos: [
        {
          github: "Tall-Agency/dev-automation-test",
          label: "Tall-Agency/dev-automation-test",
          default_branch: "main",
          theme_path: "web/app/themes/ai-dev",
          cursor_webhooks: {
            plan: "https://api2.cursor.sh/automations/webhook/4165be44-aac5-11f1-b532-320a589b8025",
            implement: "https://api2.cursor.sh/automations/webhook/5937f78c-aac7-11f1-b532-320a589b8025",
            reopened_nudge: "https://api2.cursor.sh/automations/webhook/80d52667-aac7-11f1-b532-320a589b8025"
          }
        }
      ]
    }
  }
};

// src/freshdesk.ts
async function loadRegistry(env) {
  if (env.SITE_REGISTRY) {
    const fromKv = await env.SITE_REGISTRY.get("site-registry", "json");
    if (fromKv && typeof fromKv === "object") {
      return fromKv;
    }
  }
  return site_registry_default;
}
function apiBase(env) {
  const domain = env.FRESHDESK_DOMAIN.replace(/^https?:\/\//, "").replace(
    /\/$/,
    ""
  );
  return `https://${domain}/api/v2`;
}
function basicAuthHeader(apiKey) {
  const token = btoa(`${apiKey}:X`);
  return `Basic ${token}`;
}
function authHeaders(env) {
  return {
    Authorization: basicAuthHeader(env.FRESHDESK_API_KEY),
    "Content-Type": "application/json"
  };
}
function getCustomField(ticket, fieldKey) {
  const value = ticket.custom_fields?.[fieldKey];
  if (value === null || value === void 0 || value === "") return null;
  return String(value);
}
async function fetchTicket(env, ticketId) {
  const url = `${apiBase(env)}/tickets/${ticketId}`;
  const res = await fetch(url, { headers: authHeaders(env) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Freshdesk GET ticket ${ticketId} failed: ${res.status} ${body}`);
  }
  return await res.json();
}
async function fetchConversations(env, ticketId) {
  const url = `${apiBase(env)}/tickets/${ticketId}/conversations`;
  const res = await fetch(url, { headers: authHeaders(env) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Freshdesk GET conversations ${ticketId} failed: ${res.status} ${body}`
    );
  }
  return await res.json();
}
async function createPrivateNote(env, ticketId, body) {
  const url = `${apiBase(env)}/tickets/${ticketId}/notes`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(env),
    body: JSON.stringify({
      body,
      private: true
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Freshdesk create note on ticket ${ticketId} failed: ${res.status} ${text}`
    );
  }
  return res.json().catch(() => ({ ok: true }));
}
async function updateTicket(env, ticketId, update) {
  const url = `${apiBase(env)}/tickets/${ticketId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders(env),
    body: JSON.stringify(update)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Freshdesk update ticket ${ticketId} failed: ${res.status} ${text}`
    );
  }
  return res.json().catch(() => ({ ok: true }));
}

// src/registry.ts
function normalizeWebsiteUrl(raw) {
  if (!raw) return "";
  let value = String(raw).trim();
  if (!value) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `https://${host}${path === "/" ? "" : path}`;
  } catch {
    return value.toLowerCase().replace(/\/+$/, "").replace(/^www\./, "");
  }
}
function repoMatches(entry, requested) {
  const needle = requested.trim().toLowerCase();
  if (!needle) return false;
  return entry.github.toLowerCase() === needle || entry.label.toLowerCase() === needle;
}
function findSite(registry, websiteUrl) {
  const normalized = normalizeWebsiteUrl(websiteUrl);
  if (!normalized) return null;
  for (const [key, site] of Object.entries(registry.sites)) {
    if (normalizeWebsiteUrl(key) === normalized) {
      return { key, site };
    }
  }
  return null;
}
function resolveSiteAndRepo(registry, websiteUrl, repoField) {
  const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
  if (!normalizedUrl) {
    return {
      ok: false,
      code: "missing_website_url",
      message: "Website URL is missing on this ticket. Set the Website URL dropdown so Cursor can route to the correct site."
    };
  }
  const found = findSite(registry, normalizedUrl);
  if (!found) {
    return {
      ok: false,
      code: "unknown_website_url",
      message: `Website URL "${websiteUrl}" is not in the site registry. Add it to site-registry.json or pick a registered SLA URL.`
    };
  }
  const { site } = found;
  const repos = site.repos ?? [];
  const requestedRepo = (repoField ?? "").trim();
  if (requestedRepo) {
    const match = repos.find((r) => repoMatches(r, requestedRepo));
    if (!match) {
      const allowed2 = repos.map((r) => r.label || r.github).join(", ");
      return {
        ok: false,
        code: "invalid_repo",
        message: `Repo "${requestedRepo}" is not valid for Website URL "${normalizedUrl}". Allowed: ${allowed2 || "(none registered)"}.`
      };
    }
    return {
      ok: true,
      websiteUrl: normalizedUrl,
      site,
      repo: match,
      autoSelectedRepo: false
    };
  }
  if (repos.length === 1) {
    return {
      ok: true,
      websiteUrl: normalizedUrl,
      site,
      repo: repos[0],
      autoSelectedRepo: true
    };
  }
  if (repos.length === 0) {
    return {
      ok: false,
      code: "missing_repo_multi",
      message: `Website URL "${normalizedUrl}" has no repos in the registry.`
    };
  }
  const allowed = repos.map((r) => r.label || r.github).join(", ");
  return {
    ok: false,
    code: "missing_repo_multi",
    message: `This site has multiple repos. Set the Repo dropdown. Options: ${allowed}.`
  };
}
function eventToPhase(event) {
  switch (event) {
    case "ticket_created":
      return "plan";
    case "note_added":
      return "implement";
    case "ticket_reopened":
      return "reopened_nudge";
    default:
      return null;
  }
}

// src/index.ts
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function parseTicketId(raw) {
  if (raw === void 0 || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function parseEvent(body) {
  const event = body.event;
  if (event === "ticket_created" || event === "note_added" || event === "ticket_reopened") {
    return event;
  }
  return null;
}
function requireActionAuth(request, env) {
  const secret = env.CURSOR_WEBHOOK_SECRET || env.WEBHOOK_SHARED_SECRET;
  if (!secret) {
    return json(
      {
        error: "missing_env",
        need: ["CURSOR_WEBHOOK_SECRET or WEBHOOK_SHARED_SECRET"]
      },
      500
    );
  }
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = request.headers.get("X-Tall-Webhook-Secret") || request.headers.get("X-Tall-Action-Secret") || "";
  if (bearer !== secret && headerSecret !== secret) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
function requireInboundWebhookAuth(request, env) {
  if (!env.WEBHOOK_SHARED_SECRET) return null;
  const provided = request.headers.get("X-Tall-Webhook-Secret") || request.headers.get("X-Webhook-Secret");
  if (provided !== env.WEBHOOK_SHARED_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
async function handleWebhook(request, env) {
  const inboundAuth = requireInboundWebhookAuth(request, env);
  if (inboundAuth) return inboundAuth;
  let body;
  try {
    body = await request.json();
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
        allowed: ["ticket_created", "note_added", "ticket_reopened"]
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
    const noteBody = [
      "Cursor routing could not process this ticket.",
      "",
      resolved.message,
      "",
      `(via Cursor \u2014 router)`
    ].join("\n");
    try {
      await createPrivateNote(env, ticketId, noteBody);
    } catch (err) {
      return json(
        {
          routed: false,
          reason: resolved.code,
          message: resolved.message,
          note_error: String(err)
        },
        422
      );
    }
    return json(
      {
        routed: false,
        reason: resolved.code,
        message: resolved.message,
        private_note: true
      },
      422
    );
  }
  const origin = new URL(request.url).origin;
  const payload = {
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
      conversations
    },
    site: {
      slug: resolved.site.slug,
      staging_url: resolved.site.staging_url,
      bugherd_project_id: resolved.site.bugherd_project_id ?? null
    },
    repo: {
      github: resolved.repo.github,
      default_branch: resolved.repo.default_branch,
      theme_path: resolved.repo.theme_path
    },
    worker: {
      actions_base_url: `${origin}/actions`,
      note_path: "/actions/note",
      update_ticket_path: "/actions/update-ticket",
      auth: "Authorization: Bearer <FRESHDESK_ROUTER_SECRET>"
    }
  };
  const webhookUrl = webhookForPhase(resolved.repo, phase);
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
      cursor_body: result.body.slice(0, 500)
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
          github: resolved.repo.github
        }
      },
      502
    );
  }
}
async function handleNoteAction(request, env) {
  const authErr = requireActionAuth(request, env);
  if (authErr) return authErr;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const ticketId = parseTicketId(body.ticket_id);
  const noteBody = (body.body || "").trim();
  if (!ticketId || !noteBody) {
    return json({ error: "ticket_id and body required" }, 400);
  }
  const result = await createPrivateNote(env, ticketId, noteBody);
  return json({ ok: true, ticket_id: ticketId, result });
}
async function handleUpdateTicketAction(request, env) {
  const authErr = requireActionAuth(request, env);
  if (authErr) return authErr;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const ticketId = parseTicketId(body.ticket_id);
  if (!ticketId) {
    return json({ error: "ticket_id required" }, 400);
  }
  const update = {};
  if (body.status !== void 0) update.status = body.status;
  if (body.priority !== void 0) update.priority = body.priority;
  if (body.tags !== void 0) update.tags = body.tags;
  if (body.responder_id !== void 0) update.responder_id = body.responder_id;
  if (body.custom_fields !== void 0) update.custom_fields = body.custom_fields;
  if (Object.keys(update).length === 0) {
    return json({ error: "no update fields provided" }, 400);
  }
  const result = await updateTicket(env, ticketId, update);
  return json({ ok: true, ticket_id: ticketId, result });
}
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "tall-freshdesk-router",
        io_mode: "worker"
      });
    }
    try {
      if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/webhook")) {
        return await handleWebhook(request, env);
      }
      if (request.method === "POST" && url.pathname === "/actions/note") {
        return await handleNoteAction(request, env);
      }
      if (request.method === "POST" && url.pathname === "/actions/update-ticket") {
        return await handleUpdateTicketAction(request, env);
      }
    } catch (err) {
      return json({ error: "internal", message: String(err) }, 500);
    }
    return json({ error: "not_found" }, 404);
  }
};
export {
  index_default as default
};
