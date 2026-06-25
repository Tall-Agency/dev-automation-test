---
name: bugherd
description: >-
  BugHerd MCP workflow for Tall Dev (Bedrock WordPress): triage Backlog tickets,
  plan and implement fixes in the ai-dev theme, build assets, deploy via GitHub/DeployHQ,
  attach staging screenshots, and hand off to Ready for Tall QA. Handles reopened
  Backlog tasks (wait for QA comment, 10-minute nudge). Use when the user mentions
  BugHerd, bugherd.com, backlog tickets, or QA for talldevstg / auto-build-test.
---

# Tall Dev BugHerd

MCP server: **BugHerd** - read tool schemas before every call.

Config: [config.json](config.json) (project `527751`, column names, URLs).

Deep reference: [reference.md](reference.md). Operator guide: [scripts/bugherd/README.md](../../../scripts/bugherd/README.md).

## When to act

| User intent | Action |
|-------------|--------|
| Fix / triage backlog | `list_project_tasks` status **Backlog** → pick task(s) → lifecycle below |
| Specific task URL or number | `get_task_details` → lifecycle |
| Reopened after QA | Comment gate first (below) - do not code until issue is explained |
| Staging screenshot only | Build if needed → capture on staging → upload attachment |

Do **not** auto-implement every Backlog ticket without the user asking (unless Phase 3 automation is enabled and the task is approved in **Todo**).

## Plan → Todo → approve → implement

| Step | Status | Action |
|------|--------|--------|
| Plan | **Backlog** → **Todo** | `add_comment` with `(via Cursor — plan)` |
| Review | **Todo** | Team replies; agent reads semantic intent |
| Approve | **In progress** | Implement after clear approval |
| Revise | **Todo** | `(via Cursor — revised plan)` |
| Unclear | **Todo** | One clarifying `(via Cursor)` question |

## Official ticket lifecycle

1. **Backlog** - ticket created; plan automation may move to **Todo** for review.
2. **Todo** - plan posted; waiting for human approval.
3. **In progress** - `update_task` **before** coding (after approval).
4. Implement in `web/app/themes/ai-dev/` (PHP blocks, SCSS, JS per task URL).
5. `npm run build` in theme dir (or `scripts/deployhq-build.sh` from repo root).
6. **Git (required):** one branch per BugHerd task — `bugherd/task-{id}` from `main`. Never commit to `main` directly. Push the task branch, open a PR to `main`, merge when ready. Staging auto-deploys only when `main` is updated.
7. After merge to `main`, wait for staging deploy, then capture screenshot on staging (use `scripts/bugherd/capture-staging-screenshot.mjs` — staging requires HTTP basic auth from `.env`).
8. Handoff:
   - Staging screenshot of task URL → `prepare_attachment_upload` → PUT → `update_task_attachments` `set`
   - `add_comment` - what changed; `@` requester; `(via Cursor)`
   - `update_task_assignees` `action: "set"` → **requester**
   - `update_task` → **Ready for Tall QA**

### Checklist

```text
- [ ] get_task_details (requester, comments, task_logs)
- [ ] Reopened Backlog? comment gate (below)
- [ ] In Todo with plan? human comment approves plan (semantic review)
- [ ] update_task → In progress
- [ ] Branch bugherd/task-{id} from main (reuse if exists for rework)
- [ ] Implement in ai-dev theme + npm run build on task branch only
- [ ] PR to main → merge (triggers staging deploy)
- [ ] Screenshot staging after deploy + attachment set
- [ ] add_comment + assign requester
- [ ] update_task → Ready for Tall QA
```

## Reopened Backlog (returned from QA)

| Rule | Behavior |
|------|----------|
| No issue comment | **Stop** - no code, no status change |
| Issue comment present | Rework allowed per comment |
| 10+ min, still no comment | `add_comment` @requester; blocked until reply; `(via Cursor)` |
| Waiting live | Arm Loop (below) |

## 10-minute Loop watcher

When blocked on reopened Backlog:

1. Tell the user you are starting a **10m** Loop.
2. Read the [loop skill](file:///Users/danielmaw/.cursor/skills-cursor/loop/SKILL.md).
3. Use [scripts/bugherd/loop-reopened-backlog-prompt.md](../../../scripts/bugherd/loop-reopened-backlog-prompt.md).
4. Run once immediately, then every **10m** until stopped.

Loop ticks: **comments only** - never implement or change status.

## Cursor Automation

[automation.md](automation.md) · [automation-phases.md](automation-phases.md)

| Phase | Workflow | Behavior |
|-------|----------|----------|
| 1 | [tall-dev-reopened-backlog.yaml](../../automations/tall-dev-reopened-backlog.yaml) | Reopened Backlog nudge only |
| 2 | [tall-dev-backlog-plan.yaml](../../automations/tall-dev-backlog-plan.yaml) | Plan → **Todo** |
| 3 | [tall-dev-todo-implement.yaml](../../automations/tall-dev-todo-implement.yaml) | Semantic review → implement |

## Build and deploy

| Step | Command / rule |
|------|----------------|
| Task branch | `bugherd/task-{id}` from `main` — **one branch per BugHerd task** |
| Theme build | On task branch: `cd web/app/themes/ai-dev && npm run build` or `sh scripts/deployhq-build.sh` |
| Local verify | `sh scripts/qa-homepage.sh` (optional) |
| Deploy to staging | Merge PR into `main` only — auto-deploy runs on push to `main` |
| Staging screenshot | `scripts/bugherd/capture-staging-screenshot.mjs` (reads `STAGING_BASIC_AUTH_*` from `.env`) |
| Rework | Continue on the same `bugherd/task-{id}` branch; new commits → PR → merge `main` again |

**Never** push task fixes directly to `main`. Staging is HTTP basic auth protected — credentials live in `.env` only.

Staging site: **https://talldevstg.wpenginepowered.com** (BugHerd tracked URL).

## MCP quick reference

| Step | Tool |
|------|------|
| List backlog | `list_project_tasks` `status: "Backlog"` |
| List review queue | `list_project_tasks` `status: "Todo"` |
| Details | `get_task_details` |
| Status | `update_task` `status` |
| Assign creator | `update_task_assignees` `action: "set"` |
| Comment | `add_comment` |
| Upload | `prepare_attachment_upload` → PUT → `update_task_attachments` |

Board: https://www.bugherd.com/projects/527751/kanban
