# Pilot test plan (Tall Dev)

## Automated (done)

```bash
cd tall-freshdesk-router && npm test
```

Result (2026-09-07): **10/10 passed** - URL normalize, missing/unknown Website URL, single-repo auto-select, explicit Repo, multi-repo require, multi-repo route, invalid Repo, event→phase mapping.

Wrangler dry-run build: **ok** (bundle ~11 KiB).

## Manual end-to-end (after deploy + Freshdesk rules)

1. Confirm `cf_website_url` / `cf_repo` keys via ticket_fields API; update registry if needed ([field-keys.md](field-keys.md)).
2. Create Cursor Automations from `.cursor/automations/tall-dev-freshdesk-*.yaml`; paste webhook URLs into Tall Dev `cursor_webhooks` in `site-registry.json`; redeploy Worker.
3. Create a Freshdesk test ticket:
   - Website URL = `https://talldevstg.wpenginepowered.com`
   - Repo blank (auto-select) or `Tall-Agency/dev-automation-test`
4. Expect Worker `200` with `routed: true`, phase `plan`.
5. Expect Cursor plan automation to add a **private** note ending with `(via Cursor — plan)` and move ticket toward Pending.
6. Tall staff adds private note approving the plan.
7. Freshdesk `note_added` webhook → Worker → implement automation.
8. Expect branch `freshdesk/ticket-{id}`, PR → `main`, staging screenshot, private handoff note, Ready for Tall QA.
9. Multi-repo check (later): create ticket for a site with 2+ repos, leave Repo blank → private routing note, no Cursor call; set Repo → routes correctly.

Keep `implement_automation.dry_run: true` in `.cursor/skills/freshdesk/config.json` until step 6 classification looks correct.

