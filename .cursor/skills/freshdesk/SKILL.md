---
name: freshdesk
description: >-
  Freshdesk MCP workflow for Tall Dev website SLA tickets: Website URL + Repo
  routing, private notes only, plan → approve → implement → Tall QA. Mirrors
  BugHerd phases. Use when the user mentions Freshdesk, Freshdesk tickets, or
  Website URL / Repo routing for talldevstg / auto-build-test.
---

# Tall Dev Freshdesk

**IO mode: Path 2 (Worker)** - Tall is not on Freshdesk Enterprise, so official Freshdesk MCP is unavailable.

- Ticket **reads** come from the Cloudflare Worker webhook payload (description + conversations).
- Ticket **writes** go through Worker actions: `scripts/freshdesk/worker-action.sh` (private note + update ticket).
- Optional **BugHerd** MCP for staging basic auth / BugHerd link enrichment.

Config: [config.json](config.json). Router: [tall-freshdesk-router/](../../../tall-freshdesk-router/). Path 2 docs: [path-2-worker-io.md](../../../tall-freshdesk-router/docs/path-2-worker-io.md).

## Hard rules

1. **Private notes only** - via Worker `/actions/note`. Never public reply. Never call Freshdesk `/reply`.
2. **Website URL + Repo** must resolve to this repo's `github` before implementing.
3. Tall staff communication follows the same BugHerd process (plan → review → approve → implement → QA).
4. Do **not** require Freshdesk MCP.

## Routing

| Field | Role |
|-------|------|
| Website URL | Which SLA site (must match registry / config `website_url`) |
| Repo | Which GitHub repo when a site has multiple; optional if site has exactly one |

If webhook payload includes `repo.github`, treat it as authoritative. If it does not match `config.repo.github`, private note Tall staff and stop.

BugHerd link in ticket: enrich via BugHerd MCP; do **not** override Website URL / Repo.

## Status mapping (Freshdesk ↔ BugHerd columns)

| Internal state | Freshdesk (default) | Tag (optional) |
|----------------|---------------------|----------------|
| Backlog / new | Open | `cursor-backlog` |
| Awaiting Tall approval | Pending | `cursor-todo` |
| Implementing | Open (assigned) | `cursor-in-progress` |
| Ready for Tall QA | Resolved or custom | `cursor-ready-qa` |

Adjust status IDs in [config.json](config.json) for your Freshdesk account.

## Plan → Pending → approve → implement

| Step | Status | Action |
|------|--------|--------|
| Plan | Open → **Pending** | Private note `(via Cursor — plan)` |
| Review | Pending | Tall staff private note |
| Approve | In progress (Open + tag) | Implement after clear approval |
| Revise | Pending | `(via Cursor — revised plan)` |
| Unclear | Pending | One clarifying `(via Cursor)` note |

## Official ticket lifecycle

1. Ticket created (Website URL set; Repo if multi-repo) → Worker routes to plan automation.
2. Agent posts **private** plan note → status **Pending**.
3. Tall staff private note approves / revises / clarifies.
4. On approve: branch `freshdesk/ticket-{id}` from `main`; implement in theme path from config.
5. `npm run build`; PR → merge `main` (staging auto-deploy).
6. Staging screenshot → attach via private note or ticket attachment API.
7. Private handoff note; assign Tall requester; mark Ready for Tall QA (status/tag per config).

### Checklist

```text
- [ ] Read ticket + conversations (include notes)
- [ ] Validate Website URL + Repo match this repo
- [ ] Reopened from QA? explanation note required
- [ ] Pending with plan? semantic review of latest human private note
- [ ] Status → in progress
- [ ] Branch freshdesk/ticket-{id} from main
- [ ] Implement + build on task branch only
- [ ] PR → main → merge
- [ ] Staging screenshot + private handoff note
- [ ] Ready for Tall QA
```

## Reopened from QA

| Rule | Behavior |
|------|----------|
| No issue explanation note | **Stop** - Phase 1 nudge after 10 minutes |
| Explanation present | Rework allowed |
| Nudge | Private note only; `(via Cursor)` |

## Cursor Automation

[automation.md](automation.md) · [automation-phases.md](automation-phases.md)

| Phase | Workflow |
|-------|----------|
| 1 | [tall-dev-freshdesk-reopened.yaml](../../automations/tall-dev-freshdesk-reopened.yaml) |
| 2 | [tall-dev-freshdesk-plan.yaml](../../automations/tall-dev-freshdesk-plan.yaml) |
| 3 | [tall-dev-freshdesk-implement.yaml](../../automations/tall-dev-freshdesk-implement.yaml) |

## Git and deploy

| Rule | Detail |
|------|--------|
| Branch | `freshdesk/ticket-{id}` |
| Base | `main` - never commit directly |
| Theme | `web/app/themes/ai-dev/` |
| Staging | https://talldevstg.wpenginepowered.com |

## Worker write-back quick reference

```bash
# Per-ticket token from the webhook payload. Nothing to configure.
export FRESHDESK_ACTION_TOKEN="<payload worker.action_token>"

sh scripts/freshdesk/worker-action.sh note <ticket_id> "<private note body>"
sh scripts/freshdesk/worker-action.sh update <ticket_id> '{"status":3,"tags":["cursor-todo"]}'
```

See `config.worker` and `config.status_ids`.
