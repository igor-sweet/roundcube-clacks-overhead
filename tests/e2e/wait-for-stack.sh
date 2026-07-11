#!/usr/bin/env bash
#
# Polls the E2E stack from the host/runner until both services accept
# connections. Deliberately does NOT rely on healthchecks executed
# *inside* the containers: greenmail/standalone is built on a bare JRE
# image (azul/zulu-openjdk) with no guaranteed bash/nc/curl, and the
# Roundcube apache image doesn't guarantee a `curl` binary either. Bash's
# /dev/tcp works fine here because we run it on the host, which we know
# has bash.
set -euo pipefail

SMTP_HOST="${GREENMAIL_SMTP_HOST:-localhost}"
SMTP_PORT="${GREENMAIL_SMTP_PORT:-3025}"
HTTP_URL="${ROUNDCUBE_BASE_URL:-http://localhost:8080}"
TIMEOUT_SECONDS="${WAIT_TIMEOUT:-60}"

wait_for_tcp() {
  local host="$1" port="$2" label="$3"
  local waited=0
  echo "Waiting for $label ($host:$port)..."
  until (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; do
    exec 3>&- 2>/dev/null || true
    waited=$((waited + 1))
    if [ "$waited" -ge "$TIMEOUT_SECONDS" ]; then
      echo "Timed out waiting for $label after ${TIMEOUT_SECONDS}s" >&2
      exit 1
    fi
    sleep 1
  done
  exec 3>&- 2>/dev/null || true
  echo "$label is up."
}

wait_for_http() {
  local url="$1" label="$2"
  local waited=0
  echo "Waiting for $label ($url)..."
  until curl -fs -o /dev/null "$url"; do
    waited=$((waited + 1))
    if [ "$waited" -ge "$TIMEOUT_SECONDS" ]; then
      echo "Timed out waiting for $label after ${TIMEOUT_SECONDS}s" >&2
      exit 1
    fi
    sleep 1
  done
  echo "$label is up."
}

wait_for_tcp "$SMTP_HOST" "$SMTP_PORT" "GreenMail SMTP"
wait_for_http "$HTTP_URL" "Roundcube"
