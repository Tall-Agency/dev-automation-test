# Cursor Automation - Freshdesk Path 2 (Worker I/O)

Official Freshdesk MCP is **not** available (non-Enterprise). Agents use Worker payloads + `/actions/*`.

| Phase | Name | Action |
|-------|------|--------|
| **1** | Reopened nudge | Private note via Worker |
| **2** | Plan | Private plan note → Pending via Worker |
| **3** | Implement | Semantic approval from payload → code → QA handoff via Worker |

Details: [automation-phases.md](automation-phases.md) · [path-2-worker-io.md](../../../tall-freshdesk-router/docs/path-2-worker-io.md)

Repo: **Tall-Agency/dev-automation-test**. Website URL: **https://talldevstg.wpenginepowered.com**.

---

## Setup order

1. Deploy Worker (`tall-freshdesk-router`) with `FRESHDESK_DOMAIN=help.tall.agency`.
2. Create Automations from the three `tall-dev-freshdesk-*.yaml` files (BugHerd + git only).
3. Paste webhook URLs into `site-registry.json`; redeploy Worker.
4. Point Freshdesk rules at Worker `/webhook`.
5. Provide agents `FRESHDESK_ROUTER_URL` + `FRESHDESK_ROUTER_SECRET`.

Keep `implement_automation.dry_run: true` until classification looks right.

**Never** public-reply from the agent.
