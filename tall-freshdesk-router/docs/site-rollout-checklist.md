# Per-site rollout checklist (SLA / live)

Use one copy of this block per client site. Cursor conversation for SLA sites is **Freshdesk-only**; BugHerd is intake via Zapier.

**Automations:** Route 1 - three **shared** Freshdesk Automations for all sites. Per site you only add the GitHub repo to the multi-repo environment + registry row. See [automations/README.md](../automations/README.md).

## Key information (fill before starting)

| Key | Example / notes | This site |
|-----|-----------------|-----------|
| Production URL | `https://tall.agency` | |
| Staging URL | `https://tallstaging.wpengine.com` (no trailing slash) | |
| Freshdesk Website URL value | Must match `site-registry.json` key exactly | |
| GitHub repo | `Tall-Agency/owner-repo` (private OK) | |
| Bitbucket source (if migrating) | `org/repo` or clone URL | |
| Theme path | e.g. `web/app/themes/client` | |
| Deploy branch (staging) | Branch DeployHQ watches for staging (Tall Dev: `main`; Tall Agency: `staging`) | |
| Deploy branch (production) | Branch DeployHQ watches for live (Tall Agency: `production`) | |
| DeployHQ project(s) | Often one project per environment, or two deploy targets | |
| BugHerd project id | numeric id from project URL / API | |
| Staging basic auth | from BugHerd project settings | |
| Ownership | SLA: `ownership.comms` = `freshdesk` in BugHerd skill; no BugHerd Cursor automations | |
| Zapier | BugHerd task created → Freshdesk ticket + tag `from-bugherd` + Website URL | |

## Ordered steps

1. **GitHub** - migrate Bitbucket → `Tall-Agency/...`; org access for Tall + Cursor + DeployHQ. Ensure deploy branches exist.
2. **DeployHQ** - point at GitHub; prove staging deploy from staging branch; prove production deploy (manual promote is fine at first).
3. **Freshdesk** - add Website URL (+ Repo if multi-repo) to ticket fields.
4. **Client repo files** - copy Freshdesk + BugHerd skills and `scripts/freshdesk/`; set config (`website_url`, `repo.github`, `theme_path`, `bugherd_project_id`, `git.deploy_branch`, `ownership.comms: freshdesk`).
5. **Cursor** - add this repo to the **existing** multi-repo environment for the three shared Freshdesk Automations (do **not** create new Automations).
6. **Worker** - add site to `site-registry.json` (uses `shared_cursor_webhooks`); deploy Worker.
7. **Zapier** - BugHerd → Freshdesk with Website URL + `from-bugherd` (+ BugHerd URL in description).
8. **BugHerd** - do **not** enable BugHerd Cursor automations for this project.
9. **Pilot** - BugHerd pin → Freshdesk → plan → approve → implement → merge to deploy branch → staging screenshot → Tall QA → (human) promote to production when ready.

### Branch model (Tall Agency / dual-env sites)

| Branch | Role |
|--------|------|
| `staging` | Cursor PRs merge here; DeployHQ → staging; screenshots + Tall QA |
| `production` | Live site; promote only after QA |
| `freshdesk/ticket-{id}` | Task branches cut from `staging`, PR back to `staging` |

Do **not** point `git.deploy_branch` at `production` - that would ship un-QAd fixes live.

Details: [bugherd-zapier-sla.md](bugherd-zapier-sla.md), [add-site.md](add-site.md).
