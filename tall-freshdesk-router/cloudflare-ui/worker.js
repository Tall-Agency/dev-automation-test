// src/cursor.ts
function tokenVarForPhase(phase) {
  switch (phase) {
    case "plan":
      return "CURSOR_TOKEN_PLAN";
    case "implement":
      return "CURSOR_TOKEN_IMPLEMENT";
    case "reopened_nudge":
      return "CURSOR_TOKEN_REOPENED_NUDGE";
  }
}
function normalizeToken(raw) {
  if (!raw) return void 0;
  const token = raw.trim().replace(/^Authorization\s*:\s*/i, "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return void 0;
  if (/^[0-9a-f]{64}$/i.test(token)) return `crsr_${token}`;
  return token;
}
function tokenForPhase(env, phase) {
  const scoped = phase === "plan" ? env.CURSOR_TOKEN_PLAN : phase === "implement" ? env.CURSOR_TOKEN_IMPLEMENT : env.CURSOR_TOKEN_REOPENED_NUDGE;
  return normalizeToken(scoped) || normalizeToken(env.CURSOR_WEBHOOK_SECRET);
}
async function forwardToCursor(env, webhookUrl, payload) {
  if (!webhookUrl || webhookUrl.includes("REPLACE_WITH_")) {
    throw new Error(
      `Cursor webhook URL is not configured for phase ${payload.phase} / repo ${payload.repo.github}`
    );
  }
  const token = tokenForPhase(env, payload.phase);
  if (!token) {
    throw new Error(
      `No Cursor token for phase ${payload.phase}. Set ${tokenVarForPhase(payload.phase)} to that automation's auth token.`
    );
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
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

// src/markdown.ts
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderInline(escaped) {
  const codeSpans = [];
  let out = escaped.replace(/`([^`]+)`/g, (_m, code) => {
    codeSpans.push(code);
    return `\0CODE${codeSpans.length - 1}\0`;
  });
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label, href) => /^(https?:|mailto:)/i.test(href) ? `<a href="${href}">${label}</a>` : label
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out.replace(
    /\u0000CODE(\d+)\u0000/g,
    (_m, i) => `<code style="background:#f2f2f2;padding:1px 4px;border-radius:3px">${codeSpans[Number(i)]}</code>`
  );
}
var CELL_STYLE = "border:1px solid #d0d0d0;padding:6px 10px;text-align:left;vertical-align:top";
function isTableDivider(line) {
  return /^\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}
function splitRow(line) {
  return line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      continue;
    }
    if (/^```/.test(trimmed)) {
      flushParagraph();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(escapeHtml(lines[i]));
        i++;
      }
      html.push(
        `<pre style="background:#f2f2f2;padding:10px;border-radius:4px;white-space:pre-wrap"><code>${code.join("\n")}</code></pre>`
      );
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      html.push('<hr style="border:0;border-top:1px solid #ddd">');
      continue;
    }
    if (trimmed.includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1].trim())) {
      flushParagraph();
      const head = splitRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      i--;
      const headHtml = head.map(
        (cell) => `<th style="${CELL_STYLE};background:#f7f7f7">${renderInline(
          escapeHtml(cell)
        )}</th>`
      ).join("");
      const bodyHtml = rows.map(
        (row) => `<tr>${row.map(
          (cell) => `<td style="${CELL_STYLE}">${renderInline(
            escapeHtml(cell)
          )}</td>`
        ).join("")}</tr>`
      ).join("");
      html.push(
        `<table style="border-collapse:collapse;margin:8px 0"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
      );
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      html.push(
        `<div style="margin:14px 0 4px"><strong>${renderInline(
          escapeHtml(heading[2])
        )}</strong></div>`
      );
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || ordered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      const items = [];
      while (i < lines.length) {
        const item = lines[i].trim();
        const match = bullet ? /^[-*]\s+(.*)$/.exec(item) : /^\d+[.)]\s+(.*)$/.exec(item);
        if (!match) break;
        items.push(
          `<li style="margin:2px 0">${renderInline(
            escapeHtml(match[1])
          )}</li>`
        );
        i++;
      }
      i--;
      html.push(
        `<${tag} style="margin:6px 0;padding-left:22px">${items.join("")}</${tag}>`
      );
      continue;
    }
    paragraph.push(renderInline(escapeHtml(line.trim())));
  }
  flushParagraph();
  return html.join("\n");
}

// src/token.ts
var encoder = new TextEncoder();
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
var DEFAULT_TOKEN_TTL_SECONDS = 86400;
async function mintActionToken(secret, ticketId, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS, nowSeconds = Math.floor(Date.now() / 1e3)) {
  const exp = nowSeconds + ttlSeconds;
  const body = `${ticketId}.${exp}`;
  return `${body}.${await hmacHex(secret, body)}`;
}
async function verifyActionToken(secret, token, nowSeconds = Math.floor(Date.now() / 1e3)) {
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
  if (exp <= nowSeconds) return { ok: false, reason: "expired" };
  return { ok: true, ticketId };
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
function actionSecret(env) {
  return (env.ROUTER_ACTION_SECRET || env.CURSOR_WEBHOOK_SECRET || env.WEBHOOK_SHARED_SECRET || "").trim();
}
function presentedCredential(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return (request.headers.get("X-Tall-Action-Secret") || request.headers.get("X-Tall-Webhook-Secret") || "").trim();
}
async function authorizeTicketAction(request, env, ticketId) {
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
      detail: check.ok ? "action token is for a different ticket" : `action token ${check.reason}`,
      hint: "Use worker.action_token from the webhook payload for this ticket."
    },
    401
  );
}
function requireActionAuth(request, env) {
  const secret = actionSecret(env);
  if (!secret) {
    return json(
      {
        error: "missing_env",
        need: ["ROUTER_ACTION_SECRET"]
      },
      500
    );
  }
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = (request.headers.get("X-Tall-Webhook-Secret") || request.headers.get("X-Tall-Action-Secret") || "").trim();
  if (bearer !== secret && headerSecret !== secret) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
function requireInboundWebhookAuth(request, env) {
  if (!env.WEBHOOK_SHARED_SECRET) return null;
  const provided = (request.headers.get("X-Tall-Webhook-Secret") || request.headers.get("X-Webhook-Secret") || "").trim();
  if (provided !== env.WEBHOOK_SHARED_SECRET.trim()) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
async function handleWebhook(request, env, dryRun) {
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
    if (dryRun) {
      return json(
        {
          routed: false,
          dry_run: true,
          reason: resolved.code,
          message: resolved.message,
          website_url: websiteUrl,
          repo_field: repoField
        },
        422
      );
    }
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
      conversations,
      attachments: [
        ...ticket.attachments ?? [],
        ...conversations.flatMap((c) => c.attachments ?? [])
      ]
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
      auth: "Authorization: Bearer <action_token>",
      action_token: await mintActionToken(actionSecret(env), ticketId)
    }
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
      attachments: payload.freshdesk.attachments.map((a) => ({
        name: a.name,
        content_type: a.content_type,
        size: a.size,
        has_url: Boolean(a.attachment_url)
      })),
      conversations: conversations.map((c) => ({
        private: c.private,
        incoming: c.incoming,
        body_preview: (c.body_text || "").slice(0, 300)
      }))
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
  const authErr = await authorizeTicketAction(request, env, ticketId);
  if (authErr) return authErr;
  const html = body.format === "html" ? noteBody : markdownToHtml(noteBody);
  const result = await createPrivateNote(env, ticketId, html);
  return json({ ok: true, ticket_id: ticketId, result });
}
async function handleUpdateTicketAction(request, env) {
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
  const authErr = await authorizeTicketAction(request, env, ticketId);
  if (authErr) return authErr;
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
    if (request.method === "GET" && url.pathname === "/diag") {
      const authErr = requireActionAuth(request, env);
      if (authErr) return authErr;
      const shape = (raw) => {
        if (!raw) return { set: false };
        const token = normalizeToken(raw);
        return {
          set: true,
          had_prefix: token !== raw.trim(),
          looks_like_cursor_token: Boolean(token?.startsWith("crsr_")),
          length: token?.length ?? 0
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
          all_three_tokens_identical: Boolean(plan) && plan === impl && impl === nudge,
          plan_equals_action_secret: Boolean(plan) && plan === action,
          implement_equals_action_secret: Boolean(impl) && impl === action,
          nudge_equals_action_secret: Boolean(nudge) && nudge === action,
          plan_equals_legacy: Boolean(plan) && plan === normalizeToken(env.CURSOR_WEBHOOK_SECRET)
        }
      });
    }
    try {
      if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/webhook")) {
        const dryRun = ["1", "true", "yes"].includes(
          (url.searchParams.get("dry_run") || "").toLowerCase()
        );
        return await handleWebhook(request, env, dryRun);
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
