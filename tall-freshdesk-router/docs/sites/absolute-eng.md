# Absolute Engineering — site key sheet

| Key | Value |
|-----|--------|
| Client / site name | Absolute Engineering |
| Production URL | `https://absolute-eng.com` |
| Staging URL | `https://absolute.tallpresents.co.uk` |
| Freshdesk Website URL / registry key | Dropdown `absolute-eng.com` (Worker normalizes to `https://absolute-eng.com`) |
| Bitbucket source | `https://bitbucket.org/madebytall/absolute-eng.com` |
| GitHub repo | `Tall-Agency/absolute-eng.com` |
| Theme path | `web/app/themes/absolute` |
| Deploy branch (staging) | `staging` |
| Deploy branch (production) | `production` |
| DeployHQ build | `cd web/app/themes/absolute && npm install && npm run dist` |
| BugHerd project id | `445221` |
| Staging basic auth | In BugHerd project settings |
| Ownership | Freshdesk-only (`ownership.comms: freshdesk`) |
| Zapier | BugHerd → Freshdesk + tag `from-bugherd` + Website URL `absolute-eng.com` |
| Cursor | Shared Route 1 Automations - add repo to multi-repo environment |

## Branch model

- Task branch from `staging` → PR → `staging` → DeployHQ staging → QA
- Promote `staging` → `production` for live after Tall QA

## Ordered rollout

1. GitHub: ensure `staging` + `production` from Bitbucket; Freshdesk assets on `staging`
2. DeployHQ → GitHub; prove staging deploy (`npm run dist`)
3. Freshdesk Website URL choice `absolute-eng.com`
4. Cursor multi-repo env: add `Tall-Agency/absolute-eng.com`
5. Worker `site-registry.json` + deploy
6. Zapier for BugHerd `445221`
7. No BugHerd Cursor automations on `445221`
8. Pilot ticket
