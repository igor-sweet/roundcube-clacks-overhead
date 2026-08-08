#!/usr/bin/env bash
#
# Injects a fixture mail directly into GreenMail via raw SMTP, bypassing
# Roundcube (and therefore the plugin's own message_before_send hook)
# entirely. This is what lets us construct incoming mails with full
# control over whether X-Clacks-Overhead is present, absent, or
# malformed - something the plugin itself would never let us send.
#
# Requires `swaks` (apt-get install swaks / brew install swaks).
#
# Usage: ./inject-mail.sh <fixture> [smtp-host] [smtp-port]
# Fixtures:
#   positive   - correct header, widget MUST appear
#   negative   - no header at all, widget MUST NOT appear (the core
#                negative test)
#   whitespace - header present but only whitespace; documents a known
#                quirk (see tests/unit/ClacksOverheadTest.php)
#   xss        - header value contains a <script> tag; must render
#                escaped, never executed
set -euo pipefail

FIXTURE="${1:?Usage: $0 <positive|negative|whitespace|xss> [smtp-host] [smtp-port]}"
SMTP_HOST="${2:-${GREENMAIL_SMTP_HOST:-localhost}}"
SMTP_PORT="${3:-${GREENMAIL_SMTP_PORT:-3025}}"
TO_ADDR="${TEST_USER:-tester@example.test}"
FROM_ADDR="sender@example.com"
# Every mailbox in this stack is shared and persists across runs (GreenMail
# keeps state until torn down), so a static subject would collide with
# leftovers from a previous run - or with concurrent tests - and make the
# "click the row with this subject" selector match more than one message.
# A nonce guarantees each injected mail is uniquely findable.
NONCE="$(date +%s%N 2>/dev/null || date +%s)-$$"

declare -a ADD_HEADER_ARGS=()
VALUE=""

case "$FIXTURE" in
  positive)
    SUBJECT="Clacks E2E - positive - $NONCE"
    VALUE="GNU Terry Pratchett"
    ADD_HEADER_ARGS=(--add-header "X-Clacks-Overhead: $VALUE")
    ;;
  negative)
    SUBJECT="Clacks E2E - negative - $NONCE"
    # deliberately no --add-header at all
    ;;
  whitespace)
    SUBJECT="Clacks E2E - whitespace-only header - $NONCE"
    VALUE="   "
    ADD_HEADER_ARGS=(--add-header "X-Clacks-Overhead:$VALUE")
    ;;
  xss)
    SUBJECT="Clacks E2E - xss header - $NONCE"
    VALUE='"><img src=x onerror=window.__clacks_xss_fired=true>'
    ADD_HEADER_ARGS=(--add-header "X-Clacks-Overhead: $VALUE")
    ;;
  *)
    echo "Unknown fixture '$FIXTURE'. Expected: positive | negative | whitespace | xss" >&2
    exit 1
    ;;
esac

echo "Injecting fixture '$FIXTURE' into ${SMTP_HOST}:${SMTP_PORT} for ${TO_ADDR}..."

swaks \
  --server "$SMTP_HOST" --port "$SMTP_PORT" \
  --to "$TO_ADDR" \
  --from "$FROM_ADDR" \
  --header "Subject: $SUBJECT" \
  "${ADD_HEADER_ARGS[@]+"${ADD_HEADER_ARGS[@]}"}" \
  --body "Automated E2E fixture mail for the clacks_overhead plugin (fixture: $FIXTURE)." \
  --suppress-data

echo "Fixture '$FIXTURE' delivered with subject: $SUBJECT"
# Machine-readable lines for callers (e.g. the Playwright wrapper). Subject
# is needed to find the mail again afterwards; value is the exact
# X-Clacks-Overhead content that was sent (empty for 'negative', which
# sends no header at all) - exposing it lets a caller derive expectations
# (e.g. how many characters the widget should render) from what was
# actually sent, instead of a second, independently hardcoded copy of it.
echo "FIXTURE_SUBJECT=$SUBJECT"
echo "FIXTURE_VALUE=$VALUE"