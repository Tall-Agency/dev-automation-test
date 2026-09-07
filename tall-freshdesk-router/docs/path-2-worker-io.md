# Path 2: Worker I/O

Cursor Cloud Agent polls the **tall-freshdesk-router** for queued Freshdesk webhook jobs. The agent reads ticket **conversations** from the job payload (not Freshdesk MCP) and writes back **only** via `scripts/freshdesk/worker-action.sh`.

## Flow

```text
Freshdesk webhook → Router queues job
                         ↓
Cron agent → worker-action.sh claim → payload (ticket + conversations)
                         ↓
Agent classifies latest human reply after plan marker
                         ↓
worker-action.sh private-note (always private)
                         ↓
If approved + not dry_run → implement on freshdesk/ticket-{id} → PR → merge main
                         ↓
worker-action.sh complete
```

## Environment

| Variable | Purpose |
|----------|---------|
| `FRESHDESK_ROUTER_URL` | Router base URL (no trailing slash) |
| `FRESHDESK_ROUTER_SECRET` | Bearer token for worker endpoints |

Set in the Cloud Agent environment or local `.env` (never commit secrets).

## Worker API

All requests: `Authorization: Bearer ${FRESHDESK_ROUTER_SECRET}`

### `GET /worker/claim`

Returns the next job or `204` / empty body when none.

**Response (200):**

```json
{
  "job_id": "job_abc123",
  "ticket_id": 42,
  "status": "pending_implement",
  "subject": "Footer link color",
  "url": "https://example.freshdesk.com/a/tickets/42",
  "requester_email": "client@example.com",
  "webhook_payload": {
    "ticket_id": 42,
    "conversations": [
      {
        "id": 1,
        "body_text": "Please fix the footer link.",
        "incoming": true,
        "private": false,
        "created_at": "2026-09-07T10:00:00Z",
        "user_id": 100
      },
      {
        "id": 2,
        "body_text": "Plan: update SCSS variable...\n(via Cursor — plan)",
        "incoming": false,
        "private": true,
        "created_at": "2026-09-07T11:00:00Z",
        "user_id": null
      },
      {
        "id": 3,
        "body_text": "Looks good, please implement.",
        "incoming": true,
        "private": false,
        "created_at": "2026-09-07T12:00:00Z",
        "user_id": 100
      }
    ]
  }
}
```

### `POST /worker/tickets/{ticket_id}/private-note`

Add a **private** note on the Freshdesk ticket (router proxies to Freshdesk API).

**Body:**

```json
{ "body": "Classification: approve. (via Cursor)" }
```

### `POST /worker/jobs/{job_id}/complete`

Mark job finished after agent handoff or skip.

**Body (optional):**

```json
{ "outcome": "implemented", "branch": "freshdesk/ticket-42", "pr_url": "https://github.com/..." }
```

## Classification (Phase 3)

Use **webhook_payload.conversations** only:

1. Find latest comment with `(via Cursor — plan)` or `(via Cursor — revised plan)`.
2. Collect **human** comments strictly after that plan (`incoming: true`, no `via Cursor` in body).
3. Classify the most recent human comment semantically:

| Intent | Action |
|--------|--------|
| **Approve** | Implement (unless `dry_run`) |
| **Revise** | Private note with revised plan; stay queued |
| **Unclear** | One clarifying private note |

## Dry run

When `implement_automation.dry_run` is **true** in `.cursor/skills/freshdesk/config.json`:

- Classify and post **private note** only.
- No code changes, no PR, no status change to in-progress.

## Git and deploy

| Rule | Detail |
|------|--------|
| Branch | `freshdesk/ticket-{id}` from `main` |
| Never commit | Directly to `main` |
| Deploy | Merge PR to `main` → staging auto-deploy |
| Screenshot | BugHerd `get_project_details` 527751 + `scripts/capture-staging-screenshot.mjs` on staging URL after merge |

## CLI wrapper

```bash
sh scripts/freshdesk/worker-action.sh claim
sh scripts/freshdesk/worker-action.sh private-note 42 "Summary (via Cursor)"
sh scripts/freshdesk/worker-action.sh complete job_abc123 '{"outcome":"skipped"}'
```
