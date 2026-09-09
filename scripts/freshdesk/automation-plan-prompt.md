# Cursor Automation: Freshdesk plan → Pending (Phase 2)

Read `.cursor/skills/freshdesk/config.json`.

**IO mode: Worker (no Freshdesk MCP).** Ticket context comes from the webhook payload. Write back with `scripts/freshdesk/worker-action.sh` only. Private notes only - never public reply.

## Scope

**Plan private note + move to Pending only.** Never implement or deploy.

**Max one ticket per run.** Prefer webhook runs with full payload.

## Routing / payload

1. Require webhook payload with `io_mode: "worker"`, `freshdesk.ticket_id`, `repo.github`.
2. Verify `repo.github` matches `config.repo.github`.
3. Use `freshdesk.description_text`, `freshdesk.conversations`, subject, Website URL, Repo for the plan.
4. Optional BugHerd: if description contains a BugHerd URL or config has `bugherd_project_id`, enrich via BugHerd MCP; do not override Website URL / Repo.

## Eligibility

- Skip if any conversation `body_text` already ends with `(via Cursor — plan)` or `(via Cursor — revised plan)` and status looks Pending.
- Reopened from QA without explanation: skip (Phase 1).

## Actions (via Worker)

```bash
export FRESHDESK_ACTION_TOKEN="<payload worker.action_token>"   # per-ticket; no setup needed
# FRESHDESK_ROUTER_URL is optional - the script falls back to config.worker.base_url
# FRESHDESK_ROUTER_SECRET is only a fallback for manual calls outside a webhook run

sh scripts/freshdesk/worker-action.sh note <ticket_id> "<plan body ending with (via Cursor — plan)>"
sh scripts/freshdesk/worker-action.sh update <ticket_id> '{"status":3,"tags":["cursor-todo"]}'
```

Use `config.status_ids.pending` if set (default 3).

## Plan note template

1. **Understanding**
2. **Proposed fix** under `theme_path`
3. **Verification** - branch `freshdesk/ticket-{id}`; PR → main; staging screenshot
4. **Review ask** - Tall staff reply with a **private note**
5. End `(via Cursor — plan)`

## End of run

Summary: ticket id, note posted, status update, skipped reasons.
