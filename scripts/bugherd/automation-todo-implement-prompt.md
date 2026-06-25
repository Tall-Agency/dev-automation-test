# Cursor Automation: Todo semantic review → implement (Phase 3)

Scheduled implementer for BugHerd project **Tall Dev** (`527751`). Read `.cursor/skills/bugherd/config.json` and follow `.cursor/skills/bugherd/SKILL.md`.

MCP server: **BugHerd**. Read each tool schema before calling.

## Scope

Process tasks in **Todo** with an agent plan marker. **Read and interpret** the latest **human** comment after the plan (not keyword-only).

**Max one task per run** (`implement_automation.max_tasks_per_run`).

## Git and deploy (required)

Read `git` and `deploy` in config.

| Rule | Detail |
|------|--------|
| **One branch per task** | `bugherd/task-{id}` (prefix from `git.task_branch_prefix`) |
| **Base branch** | `main` (`git.deploy_branch`) — checkout only; **never commit here** |
| **Staging deploy** | Auto-deploy fires on push to `main` only — not on task branches |
| **Flow** | task branch → commit → push → PR to `main` → merge → wait for staging → screenshot |
| **Rework** | Reuse existing `bugherd/task-{id}` if on remote; otherwise create from latest `main` |

If `implement_automation.merge_pr_to_deploy` is true: merge the PR to `main` after push (or use git PR tools). Do not mark **Ready for Tall QA** until changes are on `main` and staging reflects the fix (or note deploy delay in the handoff comment).

## Dry run mode

If `implement_automation.dry_run` is **true** in config: classify and `add_comment` only. Do **not** change code, deploy, or move to **In progress**. End summary must say `DRY RUN`.

## On each run

1. `list_project_tasks` for project `527751`, status **Todo**.
2. If none, exit with a one-line summary.
3. For each Todo task (stop after processing **one** actionable task):
   - `get_task_details` — `comments`, `task_logs`, `requester`, `url`, `status`.
   - Find the **latest** comment containing `(via Cursor — plan)` or `(via Cursor — revised plan)`. If none, skip.
   - Collect **human comments strictly after** that plan (no `via Cursor` in text).
   - If **no human comment** after the plan: skip (waiting for team review).
   - Classify the most recent human comment:

| Intent | Action |
|--------|--------|
| **Approve** | Implement (see below) |
| **Revise** | `add_comment` revised plan; `(via Cursor — revised plan)`; stay **Todo** |
| **Unclear** | One clarifying `add_comment`; `(via Cursor)`; stay **Todo** |

## Implement (Approve only)

Unless `dry_run` is true:

1. Resolve branch `bugherd/task-{id}`: checkout existing remote branch or create from `main`.
2. `update_task` → **In progress**.
3. Implement in `web/app/themes/ai-dev/` on the **task branch only**.
4. `npm run build` in theme directory (or `sh scripts/deployhq-build.sh`).
5. Commit on task branch; push to origin.
6. Open PR: task branch → `main`. Merge to `main` (triggers staging auto-deploy).
7. After merge, capture staging screenshot (HTTP basic auth required — see **Staging screenshots** below) → upload attachment.
8. `add_comment` — branch name, PR link, what changed; `@` requester; `(via Cursor)`.
9. `update_task_assignees` `action: "set"` → **requester**.
10. `update_task` → **Ready for Tall QA**.

If PR merge or deploy is blocked: comment what blocked you, leave **In progress**, summarize for manual follow-up. Do not commit to `main` outside a PR merge.

## Staging screenshots (HTTP basic auth)

Staging (`talldevstg.wpenginepowered.com`) is behind `.htaccess` basic auth. Credentials are in repo `.env` only:

- `STAGING_BASIC_AUTH_USER`
- `STAGING_BASIC_AUTH_PASSWORD`

**Do not** commit credentials. Read `staging_basic_auth` in config.

### Capture script (preferred)

1. `cd scripts/bugherd && npm install` (first time only).
2. From repo root:

```bash
TASK_URL="<task url from get_task_details>" \
OUT_FILE=".bugherd-screenshots/task-{id}-staging.png" \
node scripts/bugherd/capture-staging-screenshot.mjs
```

The script loads `.env` automatically. Optional: `SCREENSHOT_SELECTOR` for element crop.

3. `prepare_attachment_upload` → PUT → `update_task_attachments` `set`.

### Playwright fallback (if script unavailable)

Use `httpCredentials` with the same env vars when opening the task URL in Playwright or browser automation.

If auth fails: comment that staging screenshot was blocked; leave **In progress**; do not mark **Ready for Tall QA** without a screenshot unless the user explicitly waived it in the task thread.

## Review loop safety

After `max_review_loops` (default 3) without approve: tag requester to resolve in thread; stop automating that task.

## End of run

Summary: tasks checked, classifications, branch/PR actions, deploy status, dry run flag, blockers.
