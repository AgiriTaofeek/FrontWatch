#!/usr/bin/env bash
set -euo pipefail

# usage: control-api-dependency-down.sh <postgres|clickhouse>
#
# Real chaos testing found control-api had no global error handler at
# all — a stopped dependency produced Elysia's raw default response
# for an uncaught exception, which for a Postgres outage meant the
# literal failed SQL query and its bound parameters landed in the HTTP
# response body. Fixed with errorHandlingPlugin (lib/errorHandling.ts)
# — a real, precisely-characterized Elysia gotcha along the way: onError
# only covers routes registered *after* it in the same instance's
# .use() chain, regardless of .as("global").

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPENDENCY="${1:?usage: control-api-dependency-down.sh <postgres|clickhouse>}"
CONTROL_API_URL="${CONTROL_API_URL:-http://localhost:3000}"
PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required — source loadtest/.session first}"
SESSION_COOKIE="${SESSION_COOKIE:?SESSION_COOKIE is required — source loadtest/.session first}"

case "$DEPENDENCY" in
	postgres | clickhouse) ;;
	*)
		echo "unknown dependency: $DEPENDENCY (expected postgres or clickhouse)" >&2
		exit 1
		;;
esac

# issues hits ClickHouse; the bare project route hits only Postgres —
# pick whichever one actually exercises the dependency under test.
case "$DEPENDENCY" in
	postgres) ROUTE="/api/v1/projects/${PROJECT_ID}" ;;
	clickhouse) ROUTE="/api/v1/projects/${PROJECT_ID}/issues" ;;
esac

# A temp file for the body, not curl -w's combined-output-then-split
# trick — `head -n -1` (needed to strip the trailing status line from
# combined output) is a GNU coreutils extension BSD/macOS head doesn't
# support, confirmed the hard way ("head: illegal line count -- -1")
# while building this script on macOS.
BODY_FILE="$(mktemp)"

# See ingestion-postgres-down.sh's own comment on why this trap exists.
cleanup() {
	rm -f "$BODY_FILE"
	"$SCRIPT_DIR/toggle.sh" start "$DEPENDENCY" 40 >&2 || true
}
trap cleanup EXIT

fetch_status() {
	curl -s -o "$BODY_FILE" -w "%{http_code}" "${CONTROL_API_URL}${ROUTE}" -H "Cookie: fw_session=${SESSION_COOKIE}"
}

echo "== control-api-${DEPENDENCY}-down: baseline ==" >&2
STATUS="$(fetch_status)"
if [[ "$STATUS" != "200" ]]; then
	echo "FAIL: baseline status = $STATUS, want 200" >&2
	exit 1
fi
echo "  ok: 200"

"$SCRIPT_DIR/toggle.sh" stop "$DEPENDENCY" 20

echo "== during outage: expect a clean 503, no leaked internals ==" >&2
STATUS="$(fetch_status)"
BODY="$(cat "$BODY_FILE")"
FAILED=0
if [[ "$STATUS" != "503" ]]; then
	echo "FAIL: during-outage status = $STATUS, want 503" >&2
	FAILED=1
fi
if ! echo "$BODY" | grep -q "DEPENDENCY_UNAVAILABLE"; then
	echo "FAIL: response body missing DEPENDENCY_UNAVAILABLE code: $BODY" >&2
	FAILED=1
fi
# The exact regression this scenario exists to catch: operations.md's
# "never expose stack traces, SQL, internal topology" rule, made real
# rather than just documented.
if echo "$BODY" | grep -qiE "select |insert into|SQLSTATE|at Socket|ECONNREFUSED|node_modules"; then
	echo "FAIL: response body appears to leak internal details: $BODY" >&2
	FAILED=1
fi
if [[ "$FAILED" -eq 1 ]]; then
	exit 1
fi
echo "  ok: 503, clean body, nothing leaked"

"$SCRIPT_DIR/toggle.sh" start "$DEPENDENCY" 40

echo "== after recovery: expect 200 ==" >&2
sleep 2
STATUS="$(fetch_status)"
if [[ "$STATUS" != "200" ]]; then
	echo "FAIL: post-recovery status = $STATUS, want 200" >&2
	exit 1
fi
echo "  ok: 200"

echo "PASS: control-api-${DEPENDENCY}-down"
