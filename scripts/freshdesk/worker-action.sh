#!/usr/bin/env bash
# Call tall-freshdesk-router action endpoints (Path 2 - no Freshdesk MCP).
#
# Usage:
#   export FRESHDESK_ACTION_TOKEN="..."    # worker.action_token from the payload
#   # optional: FRESHDESK_ROUTER_URL / FRESHDESK_ROUTER_SECRET
#
#   scripts/freshdesk/worker-action.sh note <ticket_id> "<markdown body>"
#   scripts/freshdesk/worker-action.sh note-file <ticket_id> "<markdown body>" <file.png> [more files...]
#   scripts/freshdesk/worker-action.sh update <ticket_id> '{"status":3,"tags":["cursor-todo"]}'
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
    BODY_JSON=$(node -e 'console.log(JSON.stringify({ticket_id:Number(process.argv[1]),body:process.argv[2]}))' "$TICKET_ID" "$PAYLOAD")
    curl -sS -X POST "$BASE/actions/note" \
      -H "Authorization: Bearer $CREDENTIAL" \
      -H "Content-Type: application/json" \
      -d "$BODY_JSON"
    echo
    ;;
  note-file)
    if [[ -z "$TICKET_ID" || -z "$PAYLOAD" || -z "${4:-}" ]]; then
      echo "Usage: $0 note-file <ticket_id> <note body> <file> [more files...]" >&2
      exit 1
    fi
    shift 3
    FILES=("$@")
    for f in "${FILES[@]}"; do
      if [[ ! -f "$f" ]]; then
        echo "File not found: $f" >&2
        exit 1
      fi
    done
    BODY_JSON=$(
      TICKET_ID="$TICKET_ID" NOTE_BODY="$PAYLOAD" node --input-type=module -e '
        import { readFileSync } from "node:fs";
        import { basename } from "node:path";
        const ticketId = Number(process.env.TICKET_ID);
        const body = process.env.NOTE_BODY;
        const files = process.argv.slice(1);
        const typeFor = (name) => {
          const ext = name.split(".").pop()?.toLowerCase();
          if (ext === "png") return "image/png";
          if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
          if (ext === "gif") return "image/gif";
          if (ext === "webp") return "image/webp";
          if (ext === "pdf") return "application/pdf";
          return "application/octet-stream";
        };
        const attachments = files.map((path) => {
          const buf = readFileSync(path);
          return {
            filename: basename(path),
            content_base64: buf.toString("base64"),
            content_type: typeFor(path),
          };
        });
        process.stdout.write(JSON.stringify({ ticket_id: ticketId, body, attachments }));
      ' -- "${FILES[@]}"
    )
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
    echo "Unknown action: $ACTION (use note|note-file|update)" >&2
    exit 1
    ;;
esac
