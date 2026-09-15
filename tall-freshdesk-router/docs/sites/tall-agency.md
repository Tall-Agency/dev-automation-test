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
| Worker registry | `https://tall.agency` in `site-registry.json` (webhooks filled after Cursor automations) |

## Branch model

- Task branch from `staging` → PR → `staging` → DeployHQ staging → QA
- Promote `staging` → `production` for live (separate DeployHQ / merge)

## Cursor Freshdesk automations (create in Cursor UI)

Use yamls from repo `staging` branch:

| Phase | File | Webhook → registry key |
|-------|------|------------------------|
| Plan | `.cursor/automations/tall-agency-freshdesk-plan.yaml` | `cursor_webhooks.plan` |
| Implement | `.cursor/automations/tall-agency-freshdesk-implement.yaml` | `cursor_webhooks.implement` |
| Reopened | `.cursor/automations/tall-agency-freshdesk-reopened.yaml` | `cursor_webhooks.reopened_nudge` |

Repo: `Tall-Agency/tall.agency` · Branch: `staging` · MCP: BugHerd

After creating each automation, paste the webhook URL into `tall-freshdesk-router/site-registry.json` and redeploy the Worker.

## Freshdesk

1. Ensure custom field **Website URL** accepts `https://tall.agency`.
2. Rules (all matching): Agent **or** requester private notes; Worker `note_added` gate filters agent loops.
3. Never enable BugHerd Cursor automations on project **445234**.
