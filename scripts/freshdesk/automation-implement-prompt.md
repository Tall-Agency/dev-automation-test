# Cursor Automation: Freshdesk semantic review → implement (Phase 3, Path 2)

Scheduled implementer for Freshdesk via **tall-freshdesk-router** worker I/O. Read `.cursor/skills/freshdesk/config.json` and follow `.cursor/skills/freshdesk/SKILL.md`.

**Do not use Freshdesk MCP.** Use `webhook_payload.conversations` from the claimed job. Write back **only** via `scripts/freshdesk/worker-action.sh`.

## Scope

Each run:

1. `sh scripts/freshdesk/worker-action.sh claim`
2. If no job, exit with one-line summary.
3. Process **one** ticket (`implement_automation.max_tickets_per_run`).

Classify from **conversations in the webhook payload** — not keyword-only.

## Git and deploy (required)

Read `git` and `deploy` in config.

| Rule | Detail |
|------|--------|
| **One branch per ticket** | `freshdesk/ticket-{id}` |
| **Base branch** | `main` — checkout only; **never commit here** |
| **Staging deploy** | Auto-deploy on push to `main` only |
| **Flow** | task branch → commit → push → PR to `main` → merge → staging screenshot |
| **Rework** | Reuse existing `freshdesk/ticket-{id}` if on remote |

## Dry run mode

If `implement_automation.dry_run` is **true**: classify and **private note** only. No code, deploy, or in-progress status. End summary must say `DRY RUN`.

## Classification

From `webhook_payload.conversations`:

1. Find the **latest** entry containing `(via Cursor — plan)` or `(via Cursor — revised plan)`.
2. If none, post private note "waiting for plan" and `complete` with `outcome: skipped`.
3. Collect **human** comments strictly after that plan (`incoming: true`, body without `via Cursor`).
4. If **no human comment** after plan: private note "waiting for team review"; `complete` skipped; exit.
5. Classify the most recent human comment:

| Intent | Action |
|--------|--------|
| **Approve** | Implement (unless dry_run) |
| **Revise** | Private note revised plan `(via Cursor — revised plan)`; re-queue or complete skipped |
| **Unclear** | One clarifying private note `(via Cursor)` |

## Implement (Approve only, not dry_run)

1. Resolve branch `freshdesk/ticket-{id}`: checkout existing remote or create from `main`.
2. Implement in `web/app/themes/ai-dev/` on task branch.
3. `npm run build` in theme dir (or `sh scripts/deployhq-build.sh`).
4. Commit, push, open PR → merge to `main`.
5. After merge: BugHerd `get_project_details` project `527751`; capture staging screenshot via `scripts/capture-staging-screenshot.mjs` at ticket URL on staging.
6. Private note — branch, PR, changes `(via Cursor)`.
7. `worker-action.sh complete` with outcome + branch + pr_url.

If blocked: private note what blocked you; complete with `outcome: blocked`.

## Review loop safety

After `max_review_loops` without approve: private note tagging requester to resolve in thread; complete skipped.

## End of run

Summary: claim result, ticket id, classification, branch/PR actions, dry run flag, blockers.

**Private notes only** — never post public Freshdesk replies from the agent.
