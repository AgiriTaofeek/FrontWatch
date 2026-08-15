#!/usr/bin/env bash
set -euo pipefail

# Real chaos testing found: with no bounds anywhere on the publish
# path, killing Redpanda mid-request left an ingestion HTTP request
# hanging past a 20-second client-side cutoff with no sign of ever
# returning — franz-go's default retry policy is "effectively
# unbounded" and nothing set a delivery timeout, an HTTP server
# timeout, or a per-request context deadline. Fixed with three layered
# bounds: internal/queue's RecordDeliveryTimeout, cmd/ingestion's
# per-request context timeout, and the http.Server's own
# Read/Write/IdleTimeout as a last-resort backstop.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INGESTION_URL="${INGESTION_URL:-http://localhost:8080}"
PUBLIC_KEY="${PUBLIC_KEY:?PUBLIC_KEY is required — source loadtest/.session first}"
# cmd/ingestion's own request-processing timeout (15s) is the real
# bound. Set with real margin above that, not a hair trigger — a
# second real bug was found *because* the margin here wasn't wide
# enough the first time: internal/queue's RecordDeliveryTimeout only
# bounds record delivery, not the client's generic request retries
# (metadata refreshes chief among them), so repeated Redpanda outages
# against the same long-lived ingestion process took progressively
# longer to recover from — reproduced reliably across chaostest's own
# back-to-back scenario sequence, not a one-off. Fixed with
# internal/queue's requestRetryTimeout (kgo.RetryTimeout); confirmed
# with 5 back-to-back outage cycles against one process staying
# bounded at 10-15s each, no growth trend.
BOUND_SECONDS="${BOUND_SECONDS:-30}"

# See ingestion-postgres-down.sh's own comment on why this trap exists.
cleanup() {
	"$SCRIPT_DIR/toggle.sh" start redpanda 40 >&2 || true
}
trap cleanup EXIT

send() {
	curl -s --max-time "$BOUND_SECONDS" -o /dev/null -w "%{http_code} %{time_total}\n" \
		-X POST "$INGESTION_URL/ingest/v1/events" \
		-H "Authorization: Bearer ${PUBLIC_KEY}" -H "Content-Type: application/json" \
		-d "{\"schema_version\":1,\"sent_at\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"events\":[{\"event_id\":\"evt_chaos_ing_rp_$(date +%s%N)\",\"event_type\":\"error\",\"schema_version\":1,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"payload\":{\"message\":\"x\",\"exception_type\":\"E\",\"handled\":false}}]}"
}

echo "== ingestion-redpanda-down: baseline ==" >&2
read -r STATUS TIME < <(send)
if [[ "$STATUS" != "200" ]]; then
	echo "FAIL: baseline status = $STATUS, want 200" >&2
	exit 1
fi
echo "  ok: $STATUS in ${TIME}s"

"$SCRIPT_DIR/toggle.sh" stop redpanda 20

echo "== during outage: expect a BOUNDED response (well under ${BOUND_SECONDS}s), not a hang ==" >&2
read -r STATUS TIME < <(send)
if [[ "$STATUS" == "000" ]]; then
	echo "FAIL: request never returned within ${BOUND_SECONDS}s (curl exit was a timeout) — the hang regressed" >&2
	exit 1
fi
echo "  ok: $STATUS in ${TIME}s (bounded, did not hang)"

"$SCRIPT_DIR/toggle.sh" start redpanda 40

echo "== after recovery: expect 200, accepted ==" >&2
read -r STATUS TIME < <(send)
if [[ "$STATUS" != "200" ]]; then
	echo "FAIL: post-recovery status = $STATUS, want 200" >&2
	exit 1
fi
echo "  ok: $STATUS in ${TIME}s"

echo "PASS: ingestion-redpanda-down"
