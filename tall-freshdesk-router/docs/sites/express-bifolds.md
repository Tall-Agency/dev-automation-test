# Express Bi-Folds — site key sheet

| Key | Value |
|-----|--------|
| Production URL | `https://expressbifolds.co.uk` |
| Staging URL | `https://stage.expressbifolds.co.uk` |
| Freshdesk Website URL / registry key | `expressbifolds.co.uk` |
| Bitbucket source | `https://bitbucket.org/madebytall/expressbifolds.co.uk` |
| GitHub repo | https://github.com/Tall-Agency/expressbifolds.co.uk |
| Theme path | `web/app/themes/expressbifolding` |
| Deploy branch (staging) | `staging` |
| Deploy branch (production) | `production` |
| DeployHQ / theme build | `cd web/app/themes/expressbifolding && npm install && npm run gulp build --prod` |
| BugHerd SLA project id | `445223` |
| BugHerd staging project id | `446606` |
| Staging basic auth | In BugHerd (SLA project `445223` for agent screenshots) |
| Ownership | Freshdesk-only (`ownership.comms: freshdesk`) |
| Zapier | BugHerd `445223` → Freshdesk + tag `from-bugherd` + Website URL `expressbifolds.co.uk` |
| Cursor | Shared Route 1 — add `Tall-Agency/expressbifolds.co.uk` to multi-repo environment |
| Worker registry | `site-registry.json` → `https://expressbifolds.co.uk` |

## Branch model

- Task branch from `staging` → PR → `staging` → DeployHQ staging → QA
- Promote `staging` → `production` for live after Tall QA

## Remaining rollout

1. GitHub repo live at `Tall-Agency/expressbifolds.co.uk` (migrate from Bitbucket).
2. DeployHQ → GitHub; prove staging deploy from `staging`.
3. Client repo: Freshdesk + BugHerd skills + `scripts/freshdesk/` (template: `victorialeeds.co.uk`).
4. Cursor multi-repo env + Worker registry deploy/KV sync.
5. Freshdesk Website URL + Zapier.
6. Pilot ticket.
