#!/usr/bin/env bash
# Freshdesk Path 2 Worker I/O — router write-back CLI.
# Requires FRESHDESK_ROUTER_URL and FRESHDESK_ROUTER_SECRET (never commit secrets).
set -eu

ROUTER_URL="${FRESHDESK_ROUTER_URL:-}"
ROUTER_SECRET="${FRESHDESK_ROUTER_SECRET:-}"

die() {
  echo "{\"error\":\"$1\"}" >&2
  exit "${2:-1}"
}

require_env() {
  if [ -z "$ROUTER_URL" ]; then die "FRESHDESK_ROUTER_URL is not set"; fi
  if [ -z "$ROUTER_SECRET" ]; then die "FRESHDESK_ROUTER_SECRET is not set"; fi
}

ACTION="${1:-}"
shift || true

case "$ACTION" in
  claim)
    require_env
    tmp="$(mktemp)"
    http_code="$(curl -sS -o "$tmp" -w "%{http_code}" \
      -H "Authorization: Bearer ${ROUTER_SECRET}" \
      -H "Content-Type: application/json" \
      "${ROUTER_URL%/}/worker/claim")"
    body="$(cat "$tmp")"
    rm -f "$tmp"
    if [ "$http_code" = "204" ] || [ -z "$body" ]; then
      echo '{"status":"empty"}'
      exit 0
    fi
    if [ "$http_code" -ge 200 ] 2>/dev/null && [ "$http_code" -lt 300 ] 2>/dev/null; then
      echo "$body"
      exit 0
    fi
    die "claim failed (HTTP ${http_code}): ${body}" 2
    ;;

  private-note)
    require_env
    TICKET_ID="${1:-}"
    BODY="${2:-}"
    if [ -z "$TICKET_ID" ] || [ -z "$BODY" ]; then
      die "usage: worker-action.sh private-note <ticket_id> <body>"
    fi
    payload="$(python3 -c 'import json,sys; print(json.dumps({"body": sys.argv[1]}))' "$BODY")"
    curl -sS -X POST \
      -H "Authorization: Bearer ${ROUTER_SECRET}" \
      -H "Content-Type: application/json" \
      "${ROUTER_URL%/}/worker/tickets/${TICKET_ID}/private-note" \
      -d "$payload"
    ;;

  complete)
    require_env
    JOB_ID="${1:-}"
    META="${2:-{}}"
    if [ -z "$JOB_ID" ]; then die "usage: worker-action.sh complete <job_id> [json_meta]"; fi
    curl -sS -X POST \
      -H "Authorization: Bearer ${ROUTER_SECRET}" \
      -H "Content-Type: application/json" \
      "${ROUTER_URL%/}/worker/jobs/${JOB_ID}/complete" \
      -d "$META"
    ;;

  *)
    die "usage: worker-action.sh {claim|private-note|complete}" 1
    ;;
esac
