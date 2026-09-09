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

if [[ -z "${FRESHDESK_ROUTER_SECRET:-}" ]]; then
  echo "FRESHDESK_ROUTER_SECRET is unset. It is a Cloud Agents secret on cursor.com;" >&2
  echo "check it exists, is a runtime secret, and is scoped to this repo." >&2
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
