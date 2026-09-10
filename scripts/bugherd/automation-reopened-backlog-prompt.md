# Cursor Automation: reopened Backlog comment gate

Scheduled watcher for BugHerd project **Tall Dev** (`527751`). Read `.cursor/skills/bugherd/config.json` for column names and timing (`reopened_backlog.prompt_after_minutes`: 10).

MCP server: **BugHerd**. Read each tool schema before calling.

## Scope

**Comments only.** Never implement code, deploy, change task status, or change assignees.

## Writing style

Keep the nudge short and plain. Example:

```
Hi @{requester} - this came back from QA without a note on what still needs fixing.
Please comment with what you still see wrong. Work is blocked until then.

(via Cursor)
```

## On each run

1. `list_project_tasks` for project `527751`, status `Backlog`.
2. If no tasks, exit successfully with a one-line summary: no Backlog tasks.
3. For each Backlog task, `get_task_details` and inspect `task_logs`, `comments`, `updated_at`, `requester`.
4. Detect **reopened from QA**: `task_logs` include a transition from **Ready for Tall QA** to **Backlog** (or via Todo).
5. Find the **first comment after that reopen** that explains what failed (not the original handoff comment from the developer).
6. If **no explanatory comment**:
   - If `updated_at` is less than **10 minutes** ago: do nothing for that task.
   - If **10 minutes or more** ago, check **duplicate nudge** (below). If not a duplicate, `add_comment` asking `@` + requester display name to describe what needs fixing; say work is blocked until they comment. Append `(via Cursor)`.
7. If an explanatory comment exists: do nothing (rework happens in a normal chat when someone runs the skill).

## Duplicate nudge (required)

Do **not** post another nudge if the latest public comment on the task already:

- Asks the requester to describe what needs fixing, and
- States work is blocked until they comment, and
- Ends with `(via Cursor)`

## Skip (not reopened from QA)

Do **not** nudge tasks that are new in Backlog and were never in **Ready for Tall QA**.

## End of run

Reply with a brief summary: tasks checked, which (if any) were nudged, which are still waiting.
