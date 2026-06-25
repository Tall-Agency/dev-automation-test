# BugHerd scripts (Tall Dev)

Full workflow: [.cursor/skills/bugherd/SKILL.md](../../.cursor/skills/bugherd/SKILL.md).

Project **527751**. Staging: https://talldevstg.wpenginepowered.com

## Cursor Automations (Phases 1–3)

Setup: [automation.md](../../.cursor/skills/bugherd/automation.md).

| Phase | Prompt | Workflow |
|-------|--------|----------|
| 1 Reopened nudge | [automation-reopened-backlog-prompt.md](./automation-reopened-backlog-prompt.md) | [tall-dev-reopened-backlog.yaml](../../.cursor/automations/tall-dev-reopened-backlog.yaml) |
| 2 Plan → Todo | [automation-backlog-plan-prompt.md](./automation-backlog-plan-prompt.md) | [tall-dev-backlog-plan.yaml](../../.cursor/automations/tall-dev-backlog-plan.yaml) |
| 3 Implement | [automation-todo-implement-prompt.md](./automation-todo-implement-prompt.md) | [tall-dev-todo-implement.yaml](../../.cursor/automations/tall-dev-todo-implement.yaml) |

Optional webhooks: [webhook-setup.md](./webhook-setup.md).

## Staging screenshot (HTTP basic auth)

Staging is behind `.htaccess` auth. Add to **`.env`** (not committed):

```bash
STAGING_BASIC_AUTH_USER='talldevstg'
STAGING_BASIC_AUTH_PASSWORD='your-password'
```

First time:

```bash
cd scripts/bugherd && npm install
```

Capture after merge to `main`:

```bash
TASK_URL="https://talldevstg.wpenginepowered.com/" \
OUT_FILE=".bugherd-screenshots/task-1-staging.png" \
node scripts/bugherd/capture-staging-screenshot.mjs
```

Then upload via BugHerd MCP (`prepare_attachment_upload` → PUT → `update_task_attachments`).

## Git and deploy

- **One branch per BugHerd task:** `bugherd/task-{id}` from `main`
- **Never commit to `main` directly** for task work
- **Staging auto-deploys** when `main` is pushed — merge the task PR first, then screenshot staging

```bash
git checkout main && git pull
git checkout -b bugherd/task-42   # or checkout existing
sh scripts/deployhq-build.sh
# commit, push, open PR → merge to main
```

## Reopened Backlog watcher (Phase 1)

| Mode | How |
|------|-----|
| **Automation** | Phase 1 row above |
| **Loop** | `/loop 10m` with [loop-reopened-backlog-prompt.md](./loop-reopened-backlog-prompt.md) |

Phase 3 dry run: set `implement_automation.dry_run: true` in [config.json](../../.cursor/skills/bugherd/config.json).
