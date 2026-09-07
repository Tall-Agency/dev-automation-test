# Freshdesk automation phases (Tall Dev)

## Phase 1 - Reopened nudge

| | |
|--|--|
| **Goal** | Ticket returned from QA without an explanation → private nudge after 10 minutes |
| **Workflow** | `.cursor/automations/tall-dev-freshdesk-reopened.yaml` |
| **Prompt** | `scripts/freshdesk/automation-reopened-prompt.md` |

**Does not:** implement, deploy, or public-reply.

---

## Phase 2 - Plan → Pending

| | |
|--|--|
| **Goal** | Eligible Open ticket gets private plan note → Pending for Tall review |
| **Workflow** | `.cursor/automations/tall-dev-freshdesk-plan.yaml` |
| **Prompt** | `scripts/freshdesk/automation-plan-prompt.md` |

**Does not:** implement or deploy.

---

## Phase 3 - Semantic review → implement

| | |
|--|--|
| **Goal** | Read latest human **private** note after plan; approve → full lifecycle |
| **Workflow** | `.cursor/automations/tall-dev-freshdesk-implement.yaml` |
| **Prompt** | `scripts/freshdesk/automation-implement-prompt.md` |

**Rollout:** `implement_automation.dry_run: true` until classification is verified.

---

## Routing

All phases expect tickets already routed by [tall-freshdesk-router](../../../tall-freshdesk-router/) using Website URL + Repo. Cron fallbacks may list tickets filtered by Website URL matching this site.
