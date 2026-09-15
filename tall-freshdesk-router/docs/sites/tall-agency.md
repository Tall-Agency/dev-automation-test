# Tall Agency — site key sheet

| Key | Value |
|-----|--------|
| Production URL | `https://tall.agency` |
| Staging URL | `https://tallstaging.wpengine.com` |
| Freshdesk Website URL / registry key | `https://tall.agency` |
| Bitbucket source | `https://bitbucket.org/madebytall/tall.agency` |
| GitHub repo | `Tall-Agency/tall.agency` |
| Theme path | `web/app/themes/tall` |
| Deploy branch (staging) | `staging` |
| Deploy branch (production) | `production` |
| DeployHQ | Connected to GitHub `Tall-Agency/tall.agency`; auto-deploy on push to `staging` |
| BugHerd project id | `445234` |
| Staging basic auth | In BugHerd project settings only (do not commit) |
| Ownership | Freshdesk-only (`ownership.comms: freshdesk`) |
| Zapier | BugHerd → Freshdesk + tag `from-bugherd` + Website URL `https://tall.agency` |
| Cursor | **Shared Route 1** Automations (`shared_cursor_webhooks`) - add `Tall-Agency/tall.agency` to the multi-repo environment |

## Branch model

- Task branch from `staging` → PR → `staging` → DeployHQ staging → QA
- Promote `staging` → `production` for live (separate DeployHQ / merge)

## Cursor (no new Automations)

1. Open the three existing Tall Freshdesk Automations (plan / implement / reopened).
2. Set environment to **multi-repo** and include `Tall-Agency/tall.agency` (and `Tall-Agency/dev-automation-test`).
3. Paste prompts from [automations/](../../automations/) if the live Automations still have Tall-Dev-only wording.
4. Worker already routes `https://tall.agency` via `shared_cursor_webhooks`.

## Freshdesk

1. Ensure custom field **Website URL** accepts `https://tall.agency`.
2. Rules (all matching): Agent **or** requester private notes; Worker `note_added` gate filters agent loops.
3. Never enable BugHerd Cursor automations on project **445234**.
