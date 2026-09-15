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
- Do **not** lead with Classification, branch names, PR numbers, CSS tokens, or commit SHAs. You may add one short "Details" line at the end (PR link only) if useful.
- Aim for under ~120 words on handoffs.
- End markers exactly: `(via Cursor — revised plan)`, `(via Cursor)`, or include `(via Cursor)` on handoffs.

## Dry run

If `implement_automation.dry_run` is true: classify + private note only; no code.

## Classify

| Intent | Action |
|--------|--------|
| Approve | Implement **only if** the approved plan maps to real theme values (see Design tokens) |
| Revise | Private revised plan; stay Pending; `(via Cursor — revised plan)` |
| Unclear | Clarifying private note; stay Pending; `(via Cursor)` |

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

1. Branch `freshdesk/ticket-{id}` from `git.deploy_branch` / `implement_automation.base_branch` (or `payload.repo.default_branch`).
2. Worker update: in-progress tags/status per config.
3. Implement in `repo.theme_path`; run theme build (`npm run build` in the theme).
   If `dist/` is gitignored (Tall Agency theme), **force-add the rebuilt `dist/`** (`git add -f …/dist`) so DeployHQ ships hashed CSS/JS - SCSS-only commits will not change the live site.
   Also bump `Version:` in that theme's `style.css` when useful for any non-hashed assets; PR → merge the deploy branch (never `production` unless config says so - it must not for SLA).
4. Staging screenshot via BugHerd `get_project_details` (project from config / `site.bugherd_project_id`) + capture script against staging URL.
5. Private handoff note via Worker; Ready for Tall QA status/tags.

```bash
sh scripts/freshdesk/worker-action.sh note <id> "<handoff>"
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

## Asset cache / build output

This theme enqueues **hashed files from `dist/`** (see `manifest.json`), not `style.css` alone.
`dist/` is gitignored. After `npm run build`, you **must** `git add -f web/app/themes/tall/dist` (or the site's theme `dist/`) or DeployHQ will ship old CSS and the fix looks “done” but invisible.

Bumping `Version:` in `style.css` alone is not enough when enqueue uses hashed dist filenames with `ver=null`.

## End of run

Summary: classification, branch/PR, dry run, blockers.
