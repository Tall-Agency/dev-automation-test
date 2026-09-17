---
name: freshdesk
description: >-
  Freshdesk workflow for Express Bi-Folds (expressbifolds.co.uk) SLA tickets:
  Website URL + Repo routing, private notes only, plan → approve → implement →
  Tall QA. BugHerd is intake via Zapier; Cursor comms stay in Freshdesk.
---

# Express Bi-Folds Freshdesk

**IO mode: Path 2 (Worker)**

- Ticket reads from Worker webhook payload; writes via `scripts/freshdesk/worker-action.sh` (`note-file` for screenshots).
- BugHerd MCP for staging auth (project 445223) only.

## Hard rules

1. Private notes only.
2. Repo must be `Tall-Agency/expressbifolds.co.uk`.
3. Existing design tokens only - never invent CSS variables.
4. Merge to `staging` only. Theme build: `bash scripts/deployhq-build.sh` (gulp prod in `web/app/themes/expressbifolding`).
5. BugHerd is intake only - no BugHerd Cursor automations on 445223.
6. **Staging screenshot required** on every implement handoff: BugHerd
   `get_project_details` (445223) → `basic_auth_*` → capture script →
   `worker-action.sh note-file`. Never mark Ready for Tall QA without the PNG.
