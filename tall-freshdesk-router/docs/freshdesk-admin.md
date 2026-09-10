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
- **Action performed by:** **Agent or requester** (Agent-only does not fire private notes in this account)  
- **Events:** Note is added → **Private note** (do not leave as "Any" - that saves as unset and never matches)  
- **Condition:** none required (optional: Website URL is not blank)  
- **Action:** Trigger Webhook  

```json
{
  "ticket_id": "{{ticket.id}}",
  "event": "note_added"
}
```

Optional header: `X-Tall-Webhook-Secret: <WEBHOOK_SHARED_SECRET>`.

The Worker then gates the call: it only forwards to Cursor when the newest note is a **staff private note** that is not marked `(via Cursor …)`. Requester notes and Cursor's own notes are acknowledged but not forwarded, so clients cannot trigger implement and agents cannot loop.

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
