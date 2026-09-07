---
name: freshdesk
description: >-
  Freshdesk Path 2 Worker I/O for Tall Dev (Bedrock WordPress): poll tall-freshdesk-router
  for webhook jobs, classify approval from payload conversations (not Freshdesk MCP),
  write back via worker-action.sh, implement fixes in ai-dev theme, deploy via GitHub/DeployHQ,
  attach staging screenshots via BugHerd. Use when the user mentions Freshdesk tickets,
  tall-freshdesk-router, or Path 2 worker I/O.
---

# Tall Dev Freshdesk (Path 2 Worker I/O)

**Do not use Freshdesk MCP.** Read ticket conversations from the router job `webhook_payload`. Write back **only** via `scripts/freshdesk/worker-action.sh` (`FRESHDESK_ROUTER_URL` + `FRESHDESK_ROUTER_SECRET`).

Config: [config.json](config.json). Router contract: [path-2-worker-io.md](../../../tall-freshdesk-router/docs/path-2-worker-io.md).

## When to act

| User intent | Action |
|-------------|--------|
| Cron / automation tick | `worker-action.sh claim` → process one job max |
| Specific ticket id in payload | Classify conversations → implement or note |
| Dry run enabled | Classify + **private note** only |

## Plan → review → approve → implement

| Step | Action |
|------|--------|
| Plan posted | Private note with `(via Cursor — plan)` (Phase 2 router or prior run) |
| Review | Human reply in `webhook_payload.conversations` |
| Approve | Implement after clear approval |
| Revise | Private note revised plan `(via Cursor — revised plan)` |
| Unclear | One clarifying private note `(via Cursor)` |

## Official ticket lifecycle

1. Freshdesk webhook → router queues job.
2. Worker claims job → reads conversations from payload.
3. Classify latest human comment after plan marker.
4. **Approve:** branch `freshdesk/ticket-{id}` from `main`, implement in `web/app/themes/ai-dev/`, build, PR → merge `main`.
5. Staging screenshot after merge (BugHerd project `527751`, `scripts/capture-staging-screenshot.mjs`).
6. Private note handoff with branch/PR summary `(via Cursor)`.
7. `worker-action.sh complete`.

### Checklist

```text
- [ ] worker-action.sh claim (max one ticket per run)
- [ ] Parse webhook_payload.conversations
- [ ] Find plan marker; human comments after plan
- [ ] Classify: approve / revise / unclear
- [ ] private-note (always private)
- [ ] dry_run? stop after classify + note
- [ ] Branch freshdesk/ticket-{id} from main
- [ ] Implement + npm run build on task branch
- [ ] PR to main → merge
- [ ] Staging screenshot + BugHerd attachment if applicable
- [ ] private-note handoff + complete job
```

## Build and deploy

| Step | Command / rule |
|------|----------------|
| Task branch | `freshdesk/ticket-{id}` from `main` |
| Theme build | `cd web/app/themes/ai-dev && npm run build` or `sh scripts/deployhq-build.sh` |
| Deploy to staging | Merge PR into `main` only |
| Rework | Reuse same `freshdesk/ticket-{id}` branch |

**Never** push task fixes directly to `main`.

Staging: **https://talldevstg.wpenginepowered.com**

## Worker CLI

| Step | Command |
|------|---------|
| Claim job | `sh scripts/freshdesk/worker-action.sh claim` |
| Private note | `sh scripts/freshdesk/worker-action.sh private-note {ticket_id} "..."` |
| Complete | `sh scripts/freshdesk/worker-action.sh complete {job_id} [json]` |

## Cursor Automation

| Phase | Workflow | Behavior |
|-------|----------|----------|
| 3 | [tall-dev-freshdesk-implement.yaml](../../automations/tall-dev-freshdesk-implement.yaml) | Claim → classify → implement |

Prompt: [automation-implement-prompt.md](../../../scripts/freshdesk/automation-implement-prompt.md)

Dry run: set `implement_automation.dry_run: true` in [config.json](config.json).
