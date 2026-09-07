# Freshdesk admin setup

Worker destination: `https://<your-worker>.workers.dev/webhook` (or custom domain).

**Path 2:** Agents do not use Freshdesk MCP. Cursor write-back uses Worker `/actions/*` - see [path-2-worker-io.md](path-2-worker-io.md). Set Worker secret `FRESHDESK_DOMAIN` to `help.tall.agency`.

## Custom fields

### Website URL (existing)

1. Admin → Ticket Fields → find **Website URL**.
2. Confirm API key via `GET https://<domain>/api/v2/ticket_fields` (look for `name` like `cf_website_url`).
3. Put that name in `site-registry.json` → `freshdesk_fields.website_url`.
4. Dropdown choices must match registry site keys (same URL strings).

### Repo (new)

1. Create a **dropdown** custom field named **Repo**.
2. Options: each onboarded GitHub repo as `owner/repo` (must match `repos[].github` or `repos[].label`).
3. If available, make it a **dependent** field of Website URL so only that site's repos appear.
4. Put the API key in `freshdesk_fields.repo` (assumed `cf_repo` until confirmed).

## Automation rules (one Worker URL for all sites)

### 1. Ticket created → plan

- **When:** Ticket is created  
- **Conditions:** Website URL is set (optional filter by group/type for website SLA tickets)  
- **Action:** Trigger Webhook  
  - Method: `POST`  
  - URL: `https://<worker>/webhook`  
  - Encoding: JSON Advanced  

```json
{
  "ticket_id": {{ticket.id}},
  "event": "ticket_created"
}
```

Optional header: `X-Tall-Webhook-Secret: <WEBHOOK_SHARED_SECRET>`.

### 2. Note added → implement / review

- **When:** Ticket is updated  
- **Events:** Note is added (agent)  
- **Action:** Trigger Webhook  

```json
{
  "ticket_id": {{ticket.id}},
  "event": "note_added"
}
```

The Cursor Phase 3 automation decides whether the note is an approval (same semantic review as BugHerd).

### 3. Ticket reopened → nudge (optional)

```json
{
  "ticket_id": {{ticket.id}},
  "event": "ticket_reopened"
}
```

## Confirming field keys

```bash
curl -u "$FRESHDESK_API_KEY:X" \
  "https://$FRESHDESK_DOMAIN/api/v2/ticket_fields" \
  | jq '.[] | {label, name, type}'
```

Update `site-registry.json` if `name` differs from `cf_website_url` / `cf_repo`.

## Security

- Do not commit API keys or Cursor webhook secrets.
- Prefer `WEBHOOK_SHARED_SECRET` so only Freshdesk (with the header) can hit the Worker.
- Agent responses on tickets must remain **private notes** only (enforced in Cursor skill prompts, not by Freshdesk alone).
