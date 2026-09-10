# Cursor Automation: Backlog plan → Todo (Phase 2)

Scheduled planner for BugHerd project **Tall Dev** (`527751`). Read `.cursor/skills/bugherd/config.json` for column names, markers, and flags.

MCP server: **BugHerd**. Read each tool schema before calling.

## Scope

**Plan comment + move to Todo only.** Never implement code, deploy, change assignees, or move to **In progress** / **Ready for Tall QA**.

**Max one task per run** (`plan_automation.max_tasks_per_run`).

## Writing style (staff-facing comments)

Tall staff read these in BugHerd. Write for a busy person, not a developer.

- Short sentences. Plain English. No jargon unless naming a UI thing the reporter will recognise.
- Lead with what is wrong on the site and what you will change.
- Do **not** put CSS variables, file paths, SCSS tokens, commit hashes, or branch names in the main comment unless Tall asked a technical question.
- If you need a choice, ask it in one clear sentence with plain labels (A / B).
- Keep it short - aim for under ~150 words.
- Always end with: `(via Cursor — plan)`

## Column name

Use status **`Todo`** from config (`columns.todo`). If `update_task` fails, call `get_project_details` and use the exact `statuses[].name`.

## On each run

1. `list_project_tasks` for project `527751`, status **Backlog**.
2. If none, exit with a one-line summary.
3. For each Backlog task (stop after processing **one** eligible task):
   - `get_task_details` — inspect `task_logs`, `comments`, `status`, `requester`, `url`, description.
   - **Skip** if any comment ends with `(via Cursor — plan)` or `(via Cursor — revised plan)` and status is already **Todo**.
   - **Reopened from QA** (`task_logs` show **Ready for Tall QA** → **Backlog**, or via **Todo**):
     - Require an **explanatory comment after that reopen**.
     - If no explanatory comment: skip (Phase 1 nudge handles this).
   - **New Backlog** (never reached **Ready for Tall QA**): eligible.
   - **Rework** (reopened with explanatory comment): eligible if `plan_automation.auto_plan_rework` is true.
4. For the **first** eligible task:
   - `add_comment` plan (template below).
   - `update_task` status → **Todo**.

## Plan comment template

Tag the **requester** first (`@[{display_name}]({id})` when `requester.id` present).

```
## What's wrong
{1-2 sentences in plain English about what the reporter sees}

## What I'll change
{1-3 short bullets about the fix in everyday language}

## Next step
Please reply to approve, ask for a change, or say which option you want.

(via Cursor — plan)
```

## End of run

One-line summary: tasks checked, planned task id, skipped reasons.
