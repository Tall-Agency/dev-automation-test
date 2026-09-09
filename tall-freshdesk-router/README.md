# tall-freshdesk-router

Cloudflare Worker that routes Freshdesk tickets to the correct **per-repo** Cursor Automation using:

1. **Website URL** custom field (SLA site)
2. **Repo** custom field (GitHub `owner/repo` when a site has multiple repos)

**Path 2 (current):** Tall is not on Freshdesk Enterprise, so this Worker also owns Freshdesk **read + write** for agents (enriched payload + `/actions/note` + `/actions/update-ticket`). See [docs/path-2-worker-io.md](docs/path-2-worker-io.md).

This package lives under `auto-build-test/tall-freshdesk-router/` for the Tall Dev pilot. Extract to a standalone `tall-freshdesk-router` repo when ready.

## Flow

```
Freshdesk (ticket_created | note_added | ticket_reopened)
  → POST /webhook { ticket_id, event }
  → Worker GET ticket + conversations
  → Read cf_website_url + cf_repo → site-registry lookup
  → POST Cursor automation (enriched payload)
  → Cursor writes back via POST /actions/note | /actions/update-ticket
```

On routing failure the Worker adds a **private note** and does **not** call Cursor.

## Inspecting a ticket without starting an agent

`POST /webhook?dry_run=1` fetches the ticket, resolves site and repo, and returns
what the enriched payload would contain - but skips the Cursor forward, so no
agent run starts and no private note is posted.

```bash
curl -X POST "https://<worker>/webhook?dry_run=1" \
  -H "Content-Type: application/json" \
  -H "X-Tall-Webhook-Secret: $WEBHOOK_SHARED_SECRET" \
  -d '{"ticket_id":"262","event":"note_added"}'
```

Use it to check field mapping, repo routing, and which conversations the
approval classifier will see. Agents have no Freshdesk read access under Path 2,
so this is the only way to see a ticket as the router sees it.

## Resolution rules

| Website URL | Repo | Behaviour |
|-------------|------|-----------|
| Missing | - | Private note; stop |
| Unknown | - | Private note; stop |
| Known | Valid for site | Route |
| Known | Blank, 1 repo | Auto-select |
| Known | Blank, 2+ repos | Private note; stop |
| Known | Not in site's repos | Private note; stop |

## Setup

```bash
cd tall-freshdesk-router
npm install
npm test
```

### Secrets

```bash
npx wrangler secret put FRESHDESK_API_KEY
npx wrangler secret put FRESHDESK_DOMAIN          # tall-help.freshdesk.com
npx wrangler secret put CURSOR_WEBHOOK_SECRET     # Cursor forward + /actions/* auth
npx wrangler secret put WEBHOOK_SHARED_SECRET     # optional inbound Freshdesk auth
```

Also set agent env `FRESHDESK_ROUTER_URL` + `FRESHDESK_ROUTER_SECRET` (= `CURSOR_WEBHOOK_SECRET`).
```

### Deploy

1. Replace `REPLACE_WITH_CURSOR_*` URLs in `site-registry.json` after creating Cursor Automations.
2. Confirm Freshdesk field keys in `freshdesk_fields` (see [docs/freshdesk-admin.md](docs/freshdesk-admin.md)).
3. `npx wrangler deploy`
4. Point Freshdesk automation webhooks at `https://<worker>/webhook`.

### Local

```bash
cp .dev.vars.example .dev.vars   # fill secrets
npx wrangler dev
curl -X POST http://127.0.0.1:8787/webhook \
  -H 'Content-Type: application/json' \
  -d '{"ticket_id":123,"event":"ticket_created"}'
```

## Add a site / repo

See [docs/add-site.md](docs/add-site.md).

## Field API keys (confirm in Freshdesk)

Until confirmed via `GET /api/v2/ticket_fields`:

| Display name | Assumed API key |
|--------------|-----------------|
| Website URL | `cf_website_url` |
| Repo | `cf_repo` |

Update `site-registry.json` → `freshdesk_fields` if your account uses different keys.
