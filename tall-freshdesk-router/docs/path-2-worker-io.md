# Path 2: Worker owns Freshdesk I/O (no Enterprise MCP)

Official Freshdesk MCP requires Enterprise EAP. Tall uses **Path 2**:

1. Cloudflare Worker talks to Freshdesk REST API.
2. Worker sends Cursor an **enriched webhook payload** (description + conversations).
3. Cursor agents write back only via Worker action endpoints (`/actions/note`, `/actions/update-ticket`).
4. **Never** public-reply. Private notes only.

## Secrets

| Secret | Where |
|--------|--------|
| `FRESHDESK_API_KEY` | Worker (`wrangler secret put`) |
| `FRESHDESK_DOMAIN` | Worker - `tall-help.freshdesk.com`, not the vanity domain |
| `CURSOR_TOKEN_PLAN` | Worker - plan automation's auth token |
| `CURSOR_TOKEN_IMPLEMENT` | Worker - implement automation's auth token |
| `CURSOR_TOKEN_REOPENED_NUDGE` | Worker - reopened automation's auth token |
| `ROUTER_ACTION_SECRET` | Worker + Cloud Agents secret `FRESHDESK_ROUTER_SECRET` |
| `WEBHOOK_SHARED_SECRET` | Optional inbound auth from Freshdesk rules |

Cursor scopes an automation token to that one automation. Reusing the plan
token for implement fails with `missing required scope: automation:<id>`.

## Agent write-back

From automation / agent shell:

```bash
export FRESHDESK_ROUTER_SECRET="..."   # same as Worker ROUTER_ACTION_SECRET
# FRESHDESK_ROUTER_URL is optional - falls back to config.worker.base_url

# Private note
sh scripts/freshdesk/worker-action.sh note 12345 "$(cat <<'EOF'
Plan text here

(via Cursor — plan)
EOF
)"

# Move to Pending (status 3 is default Freshdesk Pending - confirm in your account)
sh scripts/freshdesk/worker-action.sh update 12345 '{"status":3,"tags":["cursor-todo"]}'
```

Or raw curl using `worker.actions_base_url` from the webhook payload.

## Freshdesk status IDs (defaults)

| Name | ID |
|------|-----|
| Open | 2 |
| Pending | 3 |
| Resolved | 4 |
| Closed | 5 |

Confirm under Freshdesk Admin → Ticket Statuses if customised. Store overrides in `.cursor/skills/freshdesk/config.json` → `status_ids`.

## Deploy checklist

1. `cd tall-freshdesk-router && npm test && npx wrangler deploy`
2. Set secrets (domain = `help.tall.agency`)
3. Paste Cursor webhook URLs into `site-registry.json`
4. Freshdesk automation rules → Worker `/webhook` (see [freshdesk-admin.md](freshdesk-admin.md))
5. Create Cursor Automations from `tall-dev-freshdesk-*.yaml` (BugHerd + git only; no Freshdesk MCP)
6. Put `FRESHDESK_ROUTER_URL` + `FRESHDESK_ROUTER_SECRET` where cloud agents can read them (team secrets / documented env)

## What Cursor still uses MCP for

- **BugHerd** (optional) - staging basic auth + BugHerd link enrichment
- **git/PR** - implement phase

Not Freshdesk.
