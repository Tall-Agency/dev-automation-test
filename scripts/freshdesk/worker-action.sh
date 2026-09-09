#!/usr/bin/env bash
# Call tall-freshdesk-router action endpoints (Path 2 - no Freshdesk MCP).
#
# Usage:
#   export FRESHDESK_ROUTER_URL="https://tall-freshdesk-router.<account>.workers.dev"
#   export FRESHDESK_ACTION_TOKEN="..."    # worker.action_token from the payload
#   export FRESHDESK_ROUTER_SECRET="..."   # or the Worker ROUTER_ACTION_SECRET
#
#   scripts/freshdesk/worker-action.sh note 12345 "Private note body"
#   scripts/freshdesk/worker-action.sh update 12345 '{"status":3,"tags":["cursor-todo"]}'
#
set -euo pipefail

ACTION="${1:-}"
TICKET_ID="${2:-}"
PAYLOAD="${3:-}"

CONFIG=".cursor/skills/freshdesk/config.json"

# Only the secret has to be injected; the router URL is public and lives in config.
if [[ -z "${FRESHDESK_ROUTER_URL:-}" && -f "$CONFIG" ]]; then
  FRESHDESK_ROUTER_URL=$(node -e '
    const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    process.stdout.write((c.worker && c.worker.base_url) || "");
  ' "$CONFIG" 2>/dev/null || true)
fi

if [[ -z "${FRESHDESK_ROUTER_URL:-}" ]]; then
  echo "FRESHDESK_ROUTER_URL is unset and worker.base_url is missing from $CONFIG" >&2
  exit 1
fi

# Prefer the per-ticket token from the webhook payload (worker.action_token).
# It needs no configuration, so it cannot drift like a shared secret.
CREDENTIAL="${FRESHDESK_ACTION_TOKEN:-${FRESHDESK_ROUTER_SECRET:-}}"

if [[ -z "$CREDENTIAL" ]]; then
  echo "No credential. Export FRESHDESK_ACTION_TOKEN from the webhook payload's" >&2
  echo "worker.action_token, or set FRESHDESK_ROUTER_SECRET for manual calls." >&2
  exit 1
fi

BASE="${FRESHDESK_ROUTER_URL%/}"

case "$ACTION" in
  note)
    if [[ -z "$TICKET_ID" || -z "$PAYLOAD" ]]; then
      echo "Usage: $0 note <ticket_id> <note body>" >&2
      exit 1
    fi
    # JSON-escape body via node for safety
    BODY_JSON=$(node -e 'console.log(JSON.stringify({ticket_id:Number(process.argv[1]),body:process.argv[2]}))' "$TICKET_ID" "$PAYLOAD")
    curl -sS -X POST "$BASE/actions/note" \
      -H "Authorization: Bearer $CREDENTIAL" \
      -H "Content-Type: application/json" \
      -d "$BODY_JSON"
    echo
    ;;
  update)
    if [[ -z "$TICKET_ID" || -z "$PAYLOAD" ]]; then
      echo "Usage: $0 update <ticket_id> '<json fields>'" >&2
      exit 1
    fi
    BODY_JSON=$(node -e 'const u=JSON.parse(process.argv[2]); u.ticket_id=Number(process.argv[1]); console.log(JSON.stringify(u))' "$TICKET_ID" "$PAYLOAD")
    curl -sS -X POST "$BASE/actions/update-ticket" \
      -H "Authorization: Bearer $CREDENTIAL" \
      -H "Content-Type: application/json" \
      -d "$BODY_JSON"
    echo
    ;;
  *)
    echo "Unknown action: $ACTION (use note|update)" >&2
    exit 1
    ;;
esac
