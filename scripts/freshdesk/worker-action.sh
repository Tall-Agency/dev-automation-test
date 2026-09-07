#!/usr/bin/env bash
# Call tall-freshdesk-router action endpoints (Path 2 - no Freshdesk MCP).
#
# Usage:
#   export FRESHDESK_ROUTER_URL="https://tall-freshdesk-router.<account>.workers.dev"
#   export FRESHDESK_ROUTER_SECRET="..."   # same as Worker CURSOR_WEBHOOK_SECRET
#
#   scripts/freshdesk/worker-action.sh note 12345 "Private note body"
#   scripts/freshdesk/worker-action.sh update 12345 '{"status":3,"tags":["cursor-todo"]}'
#
set -euo pipefail

ACTION="${1:-}"
TICKET_ID="${2:-}"
PAYLOAD="${3:-}"

if [[ -z "${FRESHDESK_ROUTER_URL:-}" || -z "${FRESHDESK_ROUTER_SECRET:-}" ]]; then
  echo "Set FRESHDESK_ROUTER_URL and FRESHDESK_ROUTER_SECRET" >&2
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
      -H "Authorization: Bearer $FRESHDESK_ROUTER_SECRET" \
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
      -H "Authorization: Bearer $FRESHDESK_ROUTER_SECRET" \
      -H "Content-Type: application/json" \
      -d "$BODY_JSON"
    echo
    ;;
  *)
    echo "Unknown action: $ACTION (use note|update)" >&2
    exit 1
    ;;
esac
