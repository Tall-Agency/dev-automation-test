# Add a site or repo

## Shared Automations (Route 1)

There are **three** Team Owned Freshdesk Automations for the whole Tall SLA fleet
(plan / implement / reopened). They live in a **multi-repo Cursor environment**.

Onboarding a site does **not** create new Automations. You add the GitHub repo
to that environment and a row in `site-registry.json`. Webhooks come from
`shared_cursor_webhooks`.

Canonical YAML drafts: [automations/](../automations/).

## New SLA website

1. **Freshdesk → Admin → Ticket Fields → Website URL**  
   Add the exact URL string that will be the registry key (prefer production or staging host with no trailing slash - must match tickets).

2. **Freshdesk → Repo** (dropdown)  
   Add each GitHub `owner/repo` that belongs to this site. Prefer a dependent field filtered by Website URL if your Freshdesk plan supports it.

3. **Edit `site-registry.json`** - site metadata only (no new webhook URLs):

```json
"https://client.example.com": {
  "slug": "client-slug",
  "staging_url": "https://client-staging.example.com",
  "bugherd_project_id": "123456",
  "comms": "freshdesk",
  "repos": [
    {
      "github": "Tall-Agency/client-wp",
      "label": "Tall-Agency/client-wp",
      "default_branch": "staging",
      "theme_path": "web/app/themes/client"
    }
  ]
}
```

4. In the **client GitHub repo**, copy:
   - `.cursor/skills/freshdesk/` (+ config for this site)
   - `.cursor/skills/bugherd/` with `ownership.comms: freshdesk`
   - `scripts/freshdesk/` (+ screenshot helper if needed)

5. **Cursor** - add `Tall-Agency/client-wp` to the **existing** multi-repo environment used by the three shared Freshdesk Automations. Do not create new Automations.

6. Redeploy the Worker (`npx wrangler deploy`).

7. **BugHerd + Zapier (SLA/live):** BugHerd intake → Zapier → Freshdesk ticket. Cursor runs **only** on Freshdesk. See [bugherd-zapier-sla.md](bugherd-zapier-sla.md). Do **not** enable BugHerd Cursor automations for that project.

## Additional repo under an existing site

1. Add `owner/repo` to Freshdesk Repo dropdown.
2. Append another object to that site's `repos[]`.
3. Add the repo to the shared multi-repo Cursor environment.
4. Redeploy Worker.

Single-repo sites can leave Repo blank on tickets; the Worker auto-selects. Multi-repo sites **must** set Repo.

## Optional per-repo webhook override

Only if a site must diverge from the shared Automations, set `cursor_webhooks` on that repo entry. Prefer shared.
