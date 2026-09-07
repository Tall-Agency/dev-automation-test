# Add a site or repo

## New SLA website

1. **Freshdesk → Admin → Ticket Fields → Website URL**  
   Add the exact URL string that will be the registry key (prefer `https://staging-or-prod-host` with no trailing slash).

2. **Freshdesk → Repo** (dropdown)  
   Add each GitHub `owner/repo` that belongs to this site. Prefer a dependent field filtered by Website URL if your Freshdesk plan supports it.

3. **Edit `site-registry.json`**

```json
"https://client-staging.example.com": {
  "slug": "client-slug",
  "staging_url": "https://client-staging.example.com",
  "bugherd_project_id": null,
  "repos": [
    {
      "github": "tall-agency/client-wp",
      "label": "tall-agency/client-wp",
      "default_branch": "main",
      "theme_path": "web/app/themes/client",
      "cursor_webhooks": {
        "plan": "https://...",
        "implement": "https://...",
        "reopened_nudge": "https://..."
      }
    }
  ]
}
```

4. In the **client GitHub repo**, copy:
   - `.cursor/skills/freshdesk/`
   - `scripts/freshdesk/`
   - `.cursor/automations/tall-dev-freshdesk-*.yaml` (rename + set `gitConfig.repo`)

5. Create three Cursor Automations (webhook trigger) for that repo; paste URLs into `cursor_webhooks`.

6. Redeploy the Worker (`npx wrangler deploy`) or update KV key `site-registry` if using KV.

## Additional repo under an existing site

1. Add `owner/repo` to Freshdesk Repo dropdown.
2. Append another object to that site's `repos[]`.
3. Create three Cursor Automations in **that** GitHub repo.
4. Redeploy Worker.

Single-repo sites can leave Repo blank on tickets; the Worker auto-selects. Multi-repo sites **must** set Repo.
