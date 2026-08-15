#!/usr/bin/env bash
set -euo pipefail

# Real chaos testing found: a stopped Postgres (ingestion's read-only
# credential check, ADR-022) used to collapse into the same 401 a
# genuinely bad public key produces — which packages/sdk's transport.ts
# then correctly never retries, so the SDK silently dropped events
# during a real outage instead of retrying them. Fixed:
# telemetry.ErrDependencyUnavailable distinguishes the two, mapped to
# 503 (retryable) instead of 401 (not).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INGESTION_URL="${INGESTION_URL:-http://localhost:8080}"
PUBLIC_KEY="${PUBLIC_KEY:?PUBLIC_KEY is required — source loadtest/.session first}"

# Guarantees Postgres comes back up even if this script fails/exits
# partway through — a real bug hit while building this harness: an
# earlier version had no trap, a bug elsewhere in this same script
# made it exit while Postgres was still stopped, and every later
# scenario (plus run-all.sh's own final teardown) failed as a result.
# Same class of mistake loadtest/run.sh's own header comment already
# documents for the queue-drain race.
cleanup() {
	"$SCRIPT_DIR/toggle.sh" start postgres 30 >&2 || true
}
trap cleanup EXIT

send() {
	curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -X POST "$INGESTION_URL/ingest/v1/events" \
		-H "Authorization: Bearer ${PUBLIC_KEY}" -H "Content-Type: application/json" \
		-d "{\"schema_version\":1,\"sent_at\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"events\":[{\"event_id\":\"evt_chaos_ing_pg_$(date +%s%N)\",\"event_type\":\"error\",\"schema_version\":1,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"payload\":{\"message\":\"x\",\"exception_type\":\"E\",\"handled\":false}}]}"
}

echo "== ingestion-postgres-down: baseline ==" >&2
read -r STATUS TIME < <(send)
if [[ "$STATUS" != "200" ]]; then
	echo "FAIL: baseline status = $STATUS, want 200" >&2
	exit 1
fi
echo "  ok: $STATUS in ${TIME}s"

"$SCRIPT_DIR/toggle.sh" stop postgres 20

echo "== during outage: expect 503 (DEPENDENCY_UNAVAILABLE), not 401 ==" >&2
read -r STATUS TIME < <(send)
if [[ "$STATUS" != "503" ]]; then
	echo "FAIL: during-outage status = $STATUS, want 503 (a 401 here means the misclassification regressed)" >&2
	exit 1
fi
echo "  ok: $STATUS in ${TIME}s"

"$SCRIPT_DIR/toggle.sh" start postgres 30

echo "== after recovery: expect 200 ==" >&2
read -r STATUS TIME < <(send)
if [[ "$STATUS" != "200" ]]; then
	echo "FAIL: post-recovery status = $STATUS, want 200" >&2
	exit 1
fi
echo "  ok: $STATUS in ${TIME}s"

echo "PASS: ingestion-postgres-down"
