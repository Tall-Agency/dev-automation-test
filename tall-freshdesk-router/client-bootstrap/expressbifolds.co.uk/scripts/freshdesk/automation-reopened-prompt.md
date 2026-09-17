# Cursor Automation: Freshdesk reopened nudge (Phase 1)

Read `.cursor/skills/freshdesk/config.json`.

**IO mode: Worker.** Prefer webhook payload with conversations. Writes via `scripts/freshdesk/worker-action.sh` only. Private notes only.

## Writing style

Keep the nudge short and plain. Example:

```
Hi - this ticket came back from QA without a note on what still needs fixing.
Please reply with a private note describing what you still see wrong. Work is blocked until then.

(via Cursor)
```

## On each run

1. Use `freshdesk.ticket_id` + `conversations` from payload when present.
2. Detect return from QA without an explanatory human private note after reopen.
3. If no explanation and age ≥ 10 minutes: post one private nudge via Worker; end `(via Cursor)`.
4. Duplicate guard: do not nudge if latest agent note already asks for an explanation.

```bash
sh scripts/freshdesk/worker-action.sh note <ticket_id> "<nudge body (via Cursor)>"
```

## End of run

Summary: checked, nudged, waiting.
