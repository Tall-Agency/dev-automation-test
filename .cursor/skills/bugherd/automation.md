# Cursor Automation - BugHerd (Phases 1–3)

| Phase | Name | Column | Action |
|-------|------|--------|--------|
| **1** | Reopened Backlog nudge | Backlog | One nudge if QA return without issue comment |
| **2** | Backlog plan | Backlog → **Todo** | Plan comment for team review |
| **3** | Todo implement | **Todo** | Semantic approval → implement → QA |

Phase details: [automation-phases.md](automation-phases.md). Optional webhooks: [webhook-setup.md](../../../scripts/bugherd/webhook-setup.md).

Project: **527751** (Tall Dev). Repo: **Tall-Agency/dev-automation-test**.

---

## Phase 1 - reopened Backlog nudge

1. Connect **BugHerd** in **Tools & MCP** until tool count > 0.
2. Create automation from [`.cursor/automations/tall-dev-reopened-backlog.yaml`](../../automations/tall-dev-reopened-backlog.yaml):
   - **Schedule:** `*/10 * * * *`
   - **Tools:** BugHerd MCP
   - **Workspace:** this repo root
3. Turn **On**.

---

## Phase 2 - Backlog plan → Todo

1. Create from [`.cursor/automations/tall-dev-backlog-plan.yaml`](../../automations/tall-dev-backlog-plan.yaml).
2. Confirm column **Todo** in [config.json](config.json) (`columns.todo`).
3. Turn **On**.

---

## Phase 3 - Todo semantic review → implement

1. Keep `implement_automation.dry_run: true` in config while testing.
2. Create from [`.cursor/automations/tall-dev-todo-implement.yaml`](../../automations/tall-dev-todo-implement.yaml):
   - **Tools:** BugHerd MCP + git/PR
   - **gitConfig:** `Tall-Agency/dev-automation-test` / `main` (checkout base only)
   - **Branch rule:** each task uses `bugherd/task-{id}`; merge PR to `main` for staging deploy
3. Test approve / revise / unclear on a test **Todo** task.
4. Set `dry_run: false` when ready.

---

## Shared setup

### Before opening Automations

1. **Cmd+Shift+J** → **Tools & MCP** → **BugHerd** connected.
2. Test in chat: `list BugHerd project 527751 backlog tasks`.
3. This repo includes [`.cursor/mcp.json`](../../mcp.json) with BugHerd — restart Cursor after pull.

Do not click "set up MCP" inside Automations before BugHerd is green in Settings.

### BugHerd not in Automations MCP list

1. Connect in IDE first; restart Cursor.
2. Run automation **local** first.
3. Fallback: `/loop 10m` or on-demand `run bugherd` in chat.

### Agents shortcut

Say *"Create a Cursor automation from tall-dev-backlog-plan"* with the automate skill to open the editor with a prefill.
