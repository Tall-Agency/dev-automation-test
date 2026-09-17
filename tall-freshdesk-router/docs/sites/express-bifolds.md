# Express Bi-Folds — site key sheet

| Key | Value |
|-----|--------|
| Client / site name | Express Bi-Folding Doors |
| Production URL | `https://www.expressbifolds.co.uk/` (registry key `https://expressbifolds.co.uk`) |
| Staging URL | `https://stage.expressbifolds.co.uk` |
| Freshdesk Website URL / registry key | `expressbifolds.co.uk` (Worker normalizes to `https://expressbifolds.co.uk`) |
| Bitbucket source | Confirm in DeployHQ / Bitbucket (`madebytall` org) — migrate to GitHub |
| GitHub repo (target) | `Tall-Agency/expressbifolds.co.uk` (**not created yet**) |
| Theme path | `web/app/themes/express-bifolds` (**confirm after migrate**) |
| Deploy branch (staging) | `staging` (assumed; confirm with DeployHQ) |
| Deploy branch (production) | `production` (assumed) |
| BugHerd SLA project id | `445223` — [Express Bi-Folds (SLA Backlog)](https://www.bugherd.com/projects/445223/kanban) |
| BugHerd staging project id | `446606` — intake / QA pins (not Cursor automations) |
| Staging basic auth | HTTP basic on `stage.expressbifolds.co.uk` (realm `bifoldsstaging`). Add username/password to **SLA** BugHerd project `445223` for agent screenshots. |
| Ownership | Freshdesk-only (`ownership.comms: freshdesk`) |
| Zapier | BugHerd `445223` → Freshdesk + tag `from-bugherd` + Website URL `expressbifolds.co.uk` |
| Cursor | Shared Route 1 Automations — add repo to multi-repo environment after GitHub migrate |

## Branch model

- Task branch from `staging` → PR → `staging` → DeployHQ staging → QA
- Promote `staging` → `production` for live after Tall QA

## Ordered rollout (after Victoria Leeds pilot)

1. **GitHub** — migrate Bitbucket → `Tall-Agency/expressbifolds.co.uk`; `staging` + `production` branches.
2. **DeployHQ** — point at GitHub; prove staging deploy from `staging`.
3. **Client repo** — copy from `victorialeeds.co.uk`: `.cursor/skills/freshdesk/`, `.cursor/skills/bugherd/` (`ownership.comms: freshdesk`), `scripts/freshdesk/`, `scripts/bugherd/capture-staging-screenshot.mjs`; set `config.json` (URLs, `bugherd_project_id` `445223`, theme path, `git.deploy_branch`).
4. **Cursor** — add `Tall-Agency/expressbifolds.co.uk` to the shared multi-repo Freshdesk environment.
5. **Worker** — `site-registry.json` row (done in repo); sync KV / redeploy Worker if not using KV from CI.
6. **Freshdesk** — Website URL dropdown value `expressbifolds.co.uk`; Repo `Tall-Agency/expressbifolds.co.uk`.
7. **BugHerd** — staging basic auth on project `445223`; no BugHerd Cursor automations on `445223`.
8. **Pilot** — BugHerd pin → Freshdesk → plan → approve → implement → staging screenshot → Tall QA.
