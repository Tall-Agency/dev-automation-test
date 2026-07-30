#!/bin/sh
# Structural QA for inner pages — mirror homepage gates.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"

WP_HOME="${WP_HOME:-https://auto-build-test.ssl.localhost}"
THEME_SLUG="${THEME_SLUG:-ai-dev}"
CSS_URL="${WP_HOME}/app/themes/${THEME_SLUG}/dist/css/styles.css"
FAILURES=0

pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

check_page() {
  slug="$1"
  label="$2"
  url="${WP_HOME}/${slug}/"
  code=$(curl -skL -o /dev/null -w '%{http_code}' "$url")
  if [ "$code" = "200" ]; then
    pass "${label} HTTP 200"
  else
    fail "${label} HTTP $code"
    return
  fi
  HTML=$(curl -skL "$url")
  safe_slug=$(printf '%s' "$slug" | tr '/' '-')
  printf '%s' "$HTML" > "/tmp/qa-${safe_slug}.html"
}

check_pattern() {
  slug="$1"
  pattern="$2"
  label="$3"
  safe_slug=$(printf '%s' "$slug" | tr '/' '-')
  HTML=$(cat "/tmp/qa-${safe_slug}.html" 2>/dev/null || true)
  if printf '%s' "$HTML" | grep -q "$pattern"; then
    pass "$label"
  else
    fail "$label"
  fi
}

echo "Inner pages QA — structural gates"
echo "Base: $WP_HOME"
echo ""

check_page work "Work"
check_pattern work 'work-grid__sidebar' 'Work: sticky sidebar present'
check_pattern work 'work-grid__col--right' 'Work: masonry right column present'
check_pattern work 'work-grid__intro' 'Work: intro block present'
check_pattern work 'Get in touch' 'Work: CTA copy present'
check_pattern work 'case-study-card--work' 'Work: work variant cards present'

check_page featured "Featured"
check_pattern featured 'featured-grid__sidebar' 'Featured: sidebar present'
check_pattern featured 'featured-grid__columns' 'Featured: two-column grid present'
check_pattern featured 'See all featured' 'Featured: button label present'

check_page agency "Agency"
check_pattern agency 'media-header' 'Agency: media header present'
check_pattern agency 'text-block--intro' 'Agency: intro text block present'
check_pattern agency 'centered-list--black' 'Agency: black values list present'
check_pattern agency 'scrolling-text' 'Agency: scrolling text present'
check_pattern agency 'scrolling-logos' 'Agency: client logos present'

check_page work/lego-experience "Case study LEGO"
check_pattern work/lego-experience 'media-header' 'Case study: hero present'
check_pattern work/lego-experience 'two-columns' 'Case study: meta columns present'
check_pattern work/lego-experience 'full-width-media' 'Case study: full-width media present'

CSS=$(curl -skL "$CSS_URL" 2>/dev/null || true)
if printf '%s' "$CSS" | grep -q 'work-grid__sidebar'; then
  pass 'CSS: work-grid rules compiled'
else
  fail 'CSS: work-grid rules missing'
fi
if printf '%s' "$CSS" | grep -q 'two-columns__layout'; then
  pass 'CSS: two-columns rules compiled'
else
  fail 'CSS: two-columns rules missing'
fi

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "All inner page gates passed."
  exit 0
fi
echo "$FAILURES gate(s) failed."
exit 1
