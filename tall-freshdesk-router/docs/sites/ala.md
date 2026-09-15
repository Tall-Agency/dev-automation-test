# ALA — site key sheet

| Key | Value |
|-----|--------|
| Client / site name | ALA |
| Production URL | `https://ala.co.uk` |
| Staging URL | `https://ala.tallpresents.co.uk` |
| Freshdesk Website URL / registry key | Dropdown `ala.co.uk` (Worker normalizes to `https://ala.co.uk`) |
| Bitbucket source | `https://bitbucket.org/madebytall/ala.co.uk/` |
| GitHub repo | `Tall-Agency/ala.co.uk` |
| Theme path | `web/app/themes/ala` |
| Deploy branch (staging) | `staging` |
| Deploy branch (production) | `production` |
| DeployHQ build | `cd web/app/themes/ala && npm install && npm run build` |
| BugHerd project id | `445220` |
| Staging basic auth | In BugHerd project settings |
| Ownership | Freshdesk-only (`ownership.comms: freshdesk`) |
| Zapier | BugHerd → Freshdesk + tag `from-bugherd` + Website URL `ala.co.uk` |
| Cursor | Shared Route 1 Automations - add repo to multi-repo environment |

## Branch model

- Task branch from `staging` → PR → `staging` → DeployHQ staging → QA
- Promote `staging` → `production` for live after Tall QA

## Ordered rollout

1. GitHub migrate from Bitbucket; `staging` + `production` branches
2. DeployHQ → GitHub; prove staging deploy
3. Freshdesk Website URL choice `ala.co.uk`
4. Client repo: Freshdesk + BugHerd skills, scripts, configs
5. Cursor multi-repo env: add `Tall-Agency/ala.co.uk`
6. Worker `site-registry.json` + deploy
7. Zapier for BugHerd `445220`
8. No BugHerd Cursor automations on `445220`
9. Pilot ticket
