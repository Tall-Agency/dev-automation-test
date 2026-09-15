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
| Approve | Implement |
| Revise | Private revised plan; stay Pending; `(via Cursor — revised plan)` |
| Unclear | Clarifying private note; stay Pending; `(via Cursor)` |

## Implement (Approve only)

1. Branch `freshdesk/ticket-{id}` from `git.deploy_branch` / `implement_automation.base_branch` (or `payload.repo.default_branch`).
2. Worker update: in-progress tags/status per config.
3. Implement in `repo.theme_path`; build; **if `dist/` changed, bump `Version:` in that theme's `style.css`**; PR → merge the deploy branch (never `production` unless config says so - it must not for SLA).
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

## Asset cache

Themes often enqueue CSS with `?ver={theme version}` and a long `max-age`. If the
build changed anything in `dist/`, bump `Version:` in the theme `style.css` in
the same commit. Without it the asset URL does not change, so returning visitors
keep the cached file and the fix is live but invisible - and a hard refresh hides
that from whoever checks staging.

## End of run

Summary: classification, branch/PR, dry run, blockers.
