# Cursor Automation: Freshdesk Pending → implement (Phase 3)

Read `.cursor/skills/freshdesk/config.json` and `.cursor/skills/freshdesk/SKILL.md`.

**IO mode: Worker (no Freshdesk MCP).** Context from webhook payload (`freshdesk.conversations`). Writes via `scripts/freshdesk/worker-action.sh`. Private notes only.

**Shared Automations (Route 1):** If the workspace has multiple repos, work only in `payload.repo.github` and use that repo's config.

## Scope

Interpret the latest **human private note** after the plan marker in `conversations` (where `private` is true and body has no `via Cursor`). Ignore public customer replies for approval.

**Max one ticket per run.**

## Writing style (staff-facing notes)

Tall staff read these notes in Freshdesk. Write for a busy person, not a developer.

- Short sentences. Plain English.
- Handoff notes: what changed on the site, where to look on staging, that it is ready for Tall QA.
- Clarifying / revised-plan notes: one clear question or a short updated plan - no file paths or build steps in the main text.
- Write notes as **Markdown only** (`##` headings, links, `![alt](url)` for screenshots). Never send raw HTML (`<div>`, `<img>`, etc.) - the Worker converts Markdown to HTML; HTML fed through that path shows as literal tags in Freshdesk.
- Do **not** lead with Classification, branch names, PR numbers, CSS tokens, or commit SHAs. You may add one short "Details" line at the end (PR link only) if useful.
- Aim for under ~120 words on handoffs.
- End markers exactly: `(via Cursor — revised plan)`, `(via Cursor)`, or include `(via Cursor)` on handoffs.

## Dry run

If `implement_automation.dry_run` is true: classify + private note only; no code.

## Classify (strict)

Read the latest **human** private note after the plan. Choose **one** intent. When unsure between Approve and Unclear → **Unclear**. Never invent approval.

| Intent | Only when… | Action |
|--------|------------|--------|
| **Approve** | Clear go-ahead to **build the plan as written** (e.g. "proceed", "approved", "yes go ahead", "LGTM", "do it"). | Implement **only if** the plan maps to real theme values (see Design tokens) |
| **Revise** | They change what should be built, or reject part of the plan. | Private revised plan; stay Pending; `(via Cursor — revised plan)` |
| **Unclear** | Speculation, diagnosis, extra context, questions, or anything that is **not** an explicit approve (e.g. "I think it's related to a WP/Gravity Forms update", "maybe caching?", "could this be a plugin?"). | Private clarifying note; stay Pending; `(via Cursor)`. Acknowledge their note briefly, say whether the posted plan still applies or needs a different approach, and **ask them to confirm before you build**. Do **not** implement. |

Examples that are **not** Approve: cause hypotheses, "fyi", links without "go ahead", partial thoughts, "interesting", troubleshooting tips.

## Design tokens and unknowns (hard stop)

Before writing colour, spacing, or font changes:

1. Look up existing theme tokens / patterns (e.g. `_vars.scss`, nearby components that already use the brand colour).
2. **Never invent** CSS variables, class names, or “brand” values that are not already in the theme.
3. If the ticket asks for something that does not map cleanly (e.g. “brand red” but the theme only has `--c-highlight` / `--c-orange`), **do not implement a guess**. Stay Pending and post a short private clarifying note that:
   - says what you found in plain English (e.g. the site’s red is the existing highlight colour)
   - offers the concrete alternative you would use
   - asks Tall to confirm before you build
   - ends with `(via Cursor)`
4. Same rule for missing pages, ambiguous selectors, or anything you would have to invent: clarify on the ticket, do not ship a no-op or silent fallback.

A successful build is not enough. Unknown `var(--…)` names compile fine and change nothing on the site - that counts as a failed implement.

## Implement (Approve only)

1. Branch `freshdesk/ticket-{id}` from **`git.task_base_branch`** if set, else **`implement_automation.base_branch`**.
   For SLA sites that is usually **`production`** (live tip). Do **not** cut from `staging` unless config says so.
   **Why production:** staging may hold unfinished work. The task branch must stay a clean delta from live so Tall can promote it later without dragging unrelated staging commits.
2. Worker update: in-progress tags/status per config.
3. Implement in `repo.theme_path`; run theme build (`npm run build` in the theme).
   If `dist/` is gitignored (Tall Agency theme), **force-add the rebuilt `dist/`** (`git add -f …/dist`) so DeployHQ ships hashed CSS/JS - SCSS-only commits will not change the live site.
   Also bump `Version:` in that theme's `style.css` when useful for any non-hashed assets.
   Commit on `freshdesk/ticket-{id}` and push that branch (keep it - Tall merges it to `production` after QA).
4. Land the fix on **`git.deploy_branch`** only (usually **`staging`** for SLA) for QA. Never merge the task branch to `production` in this automation.
5. **Staging screenshot is mandatory** (see Screenshot required). Never skip it.
6. Private handoff note via Worker **with the PNG attached** (`note-file`). Do **not** hotlink BugHerd/external image URLs in the note body - Freshdesk shows a broken image.
7. Ready for Tall QA status/tags - **only after** the PNG is attached.

### Landing on staging (shared history vs orphan)

After the fix commits exist on `freshdesk/ticket-{id}`:

**A. Shared history** (`production` and `staging` share an ancestor): open PR `freshdesk/ticket-{id}` → `deploy_branch` and merge.

**B. Orphan / unrelated histories** (common after Bitbucket→GitHub orphan imports - `git merge-base production staging` fails):
1. Do **not** merge `freshdesk/ticket-{id}` into `staging` (no merge base; do not use `--allow-unrelated-histories`).
2. Do **not** re-cut the task branch from `staging` (that embeds unfinished staging work into the go-live path).
3. From `deploy_branch` (`staging`), cut `freshdesk/ticket-{id}-staging`.
4. `git cherry-pick` the ticket fix commit(s) from `freshdesk/ticket-{id}` onto that branch (resolve conflicts against staging only; keep the same theme change).
5. Open PR `freshdesk/ticket-{id}-staging` → `staging` and merge.
6. Leave `freshdesk/ticket-{id}` (production-based) on the remote for Tall to merge to `production` after QA.

Detect orphan with: `git merge-base origin/production origin/staging` failing, or Git refusing the PR merge for unrelated histories.

```bash
export FRESHDESK_ACTION_TOKEN="<payload worker.action_token>"

# Capture (example)
STAGING_BASIC_AUTH_USER="<from get_project_details>" \
STAGING_BASIC_AUTH_PASSWORD="<from get_project_details>" \
TASK_URL="<staging url>" \
OUT_FILE=".bugherd-screenshots/freshdesk-{id}-staging.png" \
node scripts/bugherd/capture-staging-screenshot.mjs

# Handoff with real Freshdesk attachment (required for screenshots)
sh scripts/freshdesk/worker-action.sh note-file <id> "$(cat <<'EOF'
## Ready for Tall QA
{1-2 sentences: what was fixed, in plain English}

## Where to check
{staging URL or page section to look at}

{optional: Details: PR url}

(via Cursor)
EOF
)" ".bugherd-screenshots/freshdesk-{id}-staging.png"

sh scripts/freshdesk/worker-action.sh update <id> '{"status":4,"tags":["cursor-ready-qa"]}'
```

### Handoff note template

```
## Ready for Tall QA
{1-2 sentences: what was fixed, in plain English}

## Where to check
{staging URL or page section to look at}

{optional one line: PR link only}

(via Cursor)
```

Do **not** include a Markdown image line for the staging shot when using `note-file` - the file is a Freshdesk attachment on the note.

## Screenshot required (hard stop)

A merged PR without a Freshdesk **file** attachment is an incomplete run. Do **not** mark Ready for Tall QA and do **not** write a handoff that asks staff to “confirm on staging” instead of attaching the shot.

### Auth (Cloud Agents have no `.env`)

Staging basic auth is **not** expected in `STAGING_BASIC_AUTH_*` secrets. Always load it from BugHerd:

1. Call BugHerd MCP `get_project_details` with project id =
   `payload.site.bugherd_project_id` **or** `config.staging_basic_auth.bugherd_project_id` /
   `config.bugherd_project_id`.
2. Use response fields `basic_auth_username` and `basic_auth_password`.
3. Export them as `STAGING_BASIC_AUTH_USER` / `STAGING_BASIC_AUTH_PASSWORD` for the capture script only.

Forbidden excuses (do not use these):

- “staging HTTP basic auth was not available in the agent environment”
- Skipping capture because env vars were empty (you must call BugHerd first)
- Handoff via plain `note` without `note-file`

### Capture + attach

- URL: `payload.site.staging_url` or `config.urls.staging`.
- Script: `scripts/bugherd/capture-staging-screenshot.mjs`.
- Post with `worker-action.sh note-file` so Freshdesk stores the PNG on the note.
- Never rely on `![alt](https://files.bugherd.com/...)` or other hotlinks for QA evidence.

### If capture still fails

Stay **in progress** (do not Ready for Tall QA). Private note the real blocker only:

- BugHerd MCP error / unavailable, or
- `basic_auth_*` missing on that BugHerd project (ask owner to set project basic auth), or
- capture script / staging HTTP error

End with `(via Cursor)`.

## Asset cache / build output

This theme enqueues **hashed files from `dist/`** (see `manifest.json`), not `style.css` alone.
`dist/` is gitignored. After `npm run build`, you **must** `git add -f web/app/themes/tall/dist` (or the site's theme `dist/`) or DeployHQ will ship old CSS and the fix looks “done” but invisible.

Bumping `Version:` in `style.css` alone is not enough when enqueue uses hashed dist filenames with `ver=null`.

## End of run

Summary: classification, branch/PR, dry run, blockers.
