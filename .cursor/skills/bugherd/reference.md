# Tall Dev BugHerd - reference

## Plan → Todo → implement decision tree

```
Task status = Backlog?
  └─ Reopened from QA without issue comment?
        └─ Yes → Phase 1 nudge only; Phase 2 skips
        └─ No → eligible for Phase 2 plan → Todo

Task status = Todo?
  └─ Plan marker present?
        └─ Human comment after plan?
              ├─ Approve → In progress → implement → Ready for Tall QA
              ├─ Revise → revised plan; stay Todo
              └─ Unclear → clarifying comment; stay Todo
```

## Comment markers

| Marker | Use |
|--------|-----|
| `(via Cursor — plan)` | Initial plan |
| `(via Cursor — revised plan)` | Updated plan |
| `(via Cursor)` | Nudge, clarify, handoff |

## Kanban columns (project 527751)

Backlog → Todo → In progress → Content → Ready for client QA → Ready for Tall QA → Done

QA handoff target: **Ready for Tall QA**. Reopened-from-QA detection uses **Ready for Tall QA** → **Backlog** in `task_logs`.

## Git and deploy

```
Every BugHerd task → branch bugherd/task-{id} from main
  → implement + npm run build (on task branch only)
  → push → PR to main → merge
  → auto-deploy to staging (push to main)
  → screenshot staging → Ready for Tall QA
```

Never commit task work directly to `main`. Task branches do not deploy until merged.

## Attachment flow

```
prepare_attachment_upload(project_id, task_id, files[])
  → PUT file bytes to put_url (no extra headers)
  → update_task_attachments(action: "set", attachments: [{ file_name, url: public_url }])
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `update_task` Todo fails | Use exact `columns.todo` from config (`Todo`) |
| Staging screenshot wrong | Run `capture-staging-screenshot.mjs`; confirm `STAGING_BASIC_AUTH_*` in `.env` |
| Auth dialog / blank shot | `.env` credentials; script uses Playwright `httpCredentials` |
| Build missing on staging | `npm run build` on task branch; merge PR to `main` |
| Staging not updated | Confirm merge to `main` completed (deploy is main-only) |
| S3 PUT 403 | Omit `x-amz-acl` on PUT |

Config: [config.json](config.json). Automations: [automation.md](automation.md).
