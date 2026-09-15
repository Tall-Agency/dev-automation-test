# BugHerd → Freshdesk (Zapier) for SLA / live sites

For production/SLA sites, **Freshdesk owns all Cursor conversation**. BugHerd is intake only (pins, screenshots). Zapier creates the Freshdesk ticket; Cursor plan / approve / implement run only on Freshdesk.

## Why

Without this split, BugHerd Cursor and Freshdesk Cursor both plan and implement the same report (two PRs, duplicate credits, messy QA).

## Zapier checklist

**Trigger:** BugHerd → Task created (that live project's id).

**Action:** Freshdesk → Create ticket:

| Field | Value |
|-------|--------|
| Subject | Task title / short description |
| Description | Task text + BugHerd share/view URL + screenshot link if available |
| **Website URL** (`cf_website_url`) | Exact staging/live URL string in `site-registry.json` (required for Worker routing) |
| Repo | GitHub `owner/repo` if the site has more than one repo |
| **Tag** | `from-bugherd` (required marker) |
| Optional | Custom field or description line `bugherd_task_id={id}` |

Do **not** open a second Cursor path on BugHerd for that project.

## Cursor setup for that client repo

1. Enable **Freshdesk** automations only (plan / implement / reopened).
2. In `.cursor/skills/bugherd/config.json` set:

```json
"ownership": {
  "comms": "freshdesk"
}
```

3. Prefer **not creating** BugHerd Cursor automations for that project. If they already exist, the ownership gate makes them no-op when `comms` is `freshdesk`.
4. In `.cursor/skills/freshdesk/config.json` keep `"ownership": { "comms": "freshdesk", "from_bugherd_tag": "from-bugherd" }`.

## Tall Dev (this repo)

`ownership.comms` for BugHerd stays **`bugherd`** so the internal test board can still run BugHerd-native automations without going through Zapier.

## Staff habit

For live bugs: approve and reply in **Freshdesk private notes** only. Do not expect Cursor to follow BugHerd comment threads on SLA projects.
