# Shared Freshdesk Automations (Route 1)

Three **Team Owned** webhook Automations cover every SLA repo. The Worker
routes by Website URL → repo, then posts to these shared webhooks. The agent
reads `payload.repo.github` and works only in that repo inside a **multi-repo
Cursor environment**.

| Phase | YAML draft | Registry key |
|-------|------------|--------------|
| Plan | [tall-freshdesk-plan.yaml](tall-freshdesk-plan.yaml) | `shared_cursor_webhooks.plan` |
| Implement | [tall-freshdesk-implement.yaml](tall-freshdesk-implement.yaml) | `shared_cursor_webhooks.implement` |
| Reopened | [tall-freshdesk-reopened.yaml](tall-freshdesk-reopened.yaml) | `shared_cursor_webhooks.reopened_nudge` |

## Cursor UI setup (once)

1. Create / update the three Automations from the YAMLs above (or paste the prompts).
2. Environment: **multi-repo** - include every SLA GitHub repo (`dev-automation-test`, `tall.agency`, …).
3. Tools: BugHerd MCP + git PR on implement; no Freshdesk MCP.
4. Team Owned. Keep the three webhook URLs + `CURSOR_TOKEN_*` Worker secrets.
5. When onboarding a site: **add the repo to the multi-repo environment** - do not create new Automations.

## Per site

Still required in each client repo: `.cursor/skills/freshdesk/`, `scripts/freshdesk/`,
BugHerd skill with `ownership.comms: freshdesk`. Automation YAML copies in the
client repo are optional reference only.
