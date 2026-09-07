# Confirm Freshdesk custom field API keys

Assumed until verified against your Freshdesk account:

| Display name | Assumed `name` in API |
|--------------|------------------------|
| Website URL | `cf_website_url` |
| Repo | `cf_repo` |

## How to confirm

```bash
curl -u "$FRESHDESK_API_KEY:X" \
  "https://$FRESHDESK_DOMAIN/api/v2/ticket_fields" \
  | jq '.[] | select(.label | test("Website|Repo"; "i")) | {label, name, type}'
```

If `name` differs, update:

1. `tall-freshdesk-router/site-registry.json` → `freshdesk_fields`
2. `.cursor/skills/freshdesk/config.json` → `freshdesk_fields`

Then redeploy the Worker.
