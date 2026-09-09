# Cursor Automation: Freshdesk Pending → implement (Phase 3)

Read `.cursor/skills/freshdesk/config.json` and `.cursor/skills/freshdesk/SKILL.md`.

**IO mode: Worker (no Freshdesk MCP).** Context from webhook payload (`freshdesk.conversations`). Writes via `scripts/freshdesk/worker-action.sh`. Private notes only.

## Scope

Interpret the latest **human private note** after the plan marker in `conversations` (where `private` is true and body has no `via Cursor`). Ignore public customer replies for approval.

**Max one ticket per run.**

## Dry run

If `implement_automation.dry_run` is true: classify + private note only; no code.

## Classify

| Intent | Action |
|--------|--------|
| Approve | Implement |
| Revise | Private revised plan; stay Pending; `(via Cursor — revised plan)` |
| Unclear | Clarifying private note; stay Pending; `(via Cursor)` |

## Implement (Approve only)

1. Branch `freshdesk/ticket-{id}` from `main`.
2. Worker update: in-progress tags/status per config.
3. Implement in `theme_path`; build; **if `dist/` changed, bump `Version:` in `web/app/themes/ai-dev/style.css`**; PR → merge `main`.
4. Staging screenshot via BugHerd `get_project_details` + capture script when available.
5. Private handoff note via Worker; Ready for Tall QA status/tags.

```bash
sh scripts/freshdesk/worker-action.sh note <id> "<handoff>"
sh scripts/freshdesk/worker-action.sh update <id> '{"status":4,"tags":["cursor-ready-qa"]}'
```

## Asset cache

The theme enqueues `dist/css/styles.css?ver={theme version}` with a one-year
`max-age`. If the build changed anything in `dist/`, bump `Version:` in
`web/app/themes/ai-dev/style.css` in the same commit. Without it the asset URL
does not change, so returning visitors keep the cached file and the fix is live
but invisible - and a hard refresh hides that from whoever checks staging.

## End of run

Summary: classification, branch/PR, dry run, blockers.
