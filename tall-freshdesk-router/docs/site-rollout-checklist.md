# Per-site rollout checklist (SLA / live)

Use one copy of this block per client site. Cursor conversation for SLA sites is **Freshdesk-only**; BugHerd is intake via Zapier.

## Key information (fill before starting)

| Key | Example / notes | This site |
|-----|-----------------|-----------|
| Production URL | `https://tall.agency` | |
| Staging URL | `https://tallstaging.wpengine.com` (no trailing slash) | |
| Freshdesk Website URL value | Usually the **staging** URL; must match `site-registry.json` exactly | |
| GitHub repo | `Tall-Agency/owner-repo` (private OK) | |
| Bitbucket source (if migrating) | `org/repo` or clone URL | |
| Theme path | e.g. `web/app/themes/client` | |
| Deploy branch (staging) | Branch DeployHQ watches for staging (Tall Dev used `main`; Tall Agency: `staging`) | |
| Deploy branch (production) | Branch DeployHQ watches for live (Tall Agency: `production`) | |
| DeployHQ project(s) | Often one project per environment, or two deploy targets | |
| BugHerd project id | numeric id from project URL / API | |
| Staging basic auth | from BugHerd project settings | |
| Ownership | SLA: `ownership.comms` = `freshdesk` in BugHerd skill; no BugHerd Cursor automations | |
| Zapier | BugHerd task created → Freshdesk ticket + tag `from-bugherd` + Website URL | |

## Ordered steps

1. **GitHub** - migrate Bitbucket → `Tall-Agency/...`; org access for Tall + Cursor + DeployHQ. Ensure `staging` and `production` branches exist.
2. **DeployHQ** - point at GitHub; prove staging deploy from **`staging`**; prove production deploy from **`production`** (manual promote is fine at first).
3. **Freshdesk** - add Website URL (+ Repo if multi-repo) to ticket fields.
4. **Client repo files** - copy Freshdesk skill, scripts, three automation yamls; set config (`website_url`, `repo.github`, `theme_path`, `bugherd_project_id`, `git.deploy_branch` = **`staging`**, `ownership.comms: freshdesk`).
5. **Cursor** - three Freshdesk webhook automations (Team Owned); automation base branch = **`staging`** (never `production`); copy webhook URLs + secrets into Worker.
6. **Worker** - add site to `site-registry.json`; deploy Worker; set `CURSOR_TOKEN_*` if new automations.
7. **Zapier** - BugHerd → Freshdesk with Website URL + `from-bugherd` (+ BugHerd URL in description).
8. **BugHerd** - do **not** enable BugHerd Cursor automations for this project.
9. **Pilot** - BugHerd pin → Freshdesk → plan → approve → implement → merge to **`staging`** → staging screenshot → Tall QA → (human) promote **`staging` → `production`** when ready.

### Branch model (Tall Agency / dual-env sites)

| Branch | Role |
|--------|------|
| `staging` | Cursor PRs merge here; DeployHQ → staging; screenshots + Tall QA |
| `production` | Live site; promote only after QA |
| `freshdesk/ticket-{id}` | Task branches cut from `staging`, PR back to `staging` |

Do **not** point Cursor `git.deploy_branch` / automation base at `production` - that would ship un-QAd fixes live.

Details: [bugherd-zapier-sla.md](bugherd-zapier-sla.md), [add-site.md](add-site.md).
