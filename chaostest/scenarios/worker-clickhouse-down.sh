#!/usr/bin/env bash
set -euo pipefail

# The most severe gap real chaos testing found: cmd/worker's persist
# path used to log "CRITICAL" and move on to the next fetch when a
# ClickHouse batch write failed, leaving that batch's offsets
# uncommitted — but with no retry of its own, those events were only
# ever redelivered by an incidental consumer-group rebalance or a
# manual process restart, neither a real recovery mechanism. A
# sustained outage with the worker never restarted meant permanent,
# silent data loss. Fixed with persistBatchWithRetry: the same batch
# is retried with capped exponential backoff until it succeeds or the
# worker shuts down — this scenario proves that without ever
# restarting the worker process.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INGESTION_URL="${INGESTION_URL:-http://localhost:8080}"
CLICKHOUSE_HTTP_ADDR="${CLICKHOUSE_HTTP_ADDR:-localhost:8123}"
CLICKHOUSE_USERNAME="${CLICKHOUSE_USERNAME:-frontwatch}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-frontwatch_dev}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-frontwatch}"
PUBLIC_KEY="${PUBLIC_KEY:?PUBLIC_KEY is required — source loadtest/.session first}"
COUNT="${COUNT:-5}"
# Real worst-case observed during development: 7 attempts, capped at
# 30s between attempts, before ClickHouse came back — 180s comfortably
# covers a similar run without a hair-trigger timeout.
DRAIN_TIMEOUT_S="${DRAIN_TIMEOUT_S:-180}"

STAMP="$(date +%s%N)"
PREFIX="evt_chaos_worker_ch_${STAMP}"

# See ingestion-postgres-down.sh's own comment on why this trap exists.
cleanup() {
	"$SCRIPT_DIR/toggle.sh" start clickhouse 40 >&2 || true
}
trap cleanup EXIT

"$SCRIPT_DIR/toggle.sh" stop clickhouse 20

echo "== sending $COUNT events while ClickHouse is down (ingestion itself stays up — Postgres/Redpanda untouched) ==" >&2
for i in $(seq 1 "$COUNT"); do
	STATUS="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$INGESTION_URL/ingest/v1/events" \
		-H "Authorization: Bearer ${PUBLIC_KEY}" -H "Content-Type: application/json" \
		-d "{\"schema_version\":1,\"sent_at\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"events\":[{\"event_id\":\"${PREFIX}_${i}\",\"event_type\":\"error\",\"schema_version\":1,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"payload\":{\"message\":\"x\",\"exception_type\":\"E\",\"handled\":false}}]}")"
	if [[ "$STATUS" != "200" ]]; then
		echo "FAIL: event $i got ingestion status $STATUS, want 200 (ingestion itself should be unaffected by ClickHouse being down)" >&2
		exit 1
	fi
done
echo "  sent, all accepted by ingestion"

sleep 3
echo "== restarting ClickHouse — the worker process itself is NEVER restarted for the rest of this scenario ==" >&2
"$SCRIPT_DIR/toggle.sh" start clickhouse 40

echo "== waiting up to ${DRAIN_TIMEOUT_S}s for the worker to self-heal and persist all $COUNT events ==" >&2
ELAPSED=0
while true; do
	STORED="$(curl -s "http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
		--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
		--data-binary "SELECT count() FROM events WHERE event_id LIKE '${PREFIX}_%'")"
	echo "  t+${ELAPSED}s: ${STORED}/${COUNT} landed"
	if [[ "$STORED" -eq "$COUNT" ]]; then
		break
	fi
	if [[ "$ELAPSED" -ge "$DRAIN_TIMEOUT_S" ]]; then
		echo "FAIL: only ${STORED}/${COUNT} events landed after ${DRAIN_TIMEOUT_S}s without a worker restart — data loss regressed" >&2
		exit 1
	fi
	sleep 5
	ELAPSED=$((ELAPSED + 5))
done

curl -s "http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
	--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
	--data-binary "ALTER TABLE events DELETE WHERE event_id LIKE '${PREFIX}_%'" >/dev/null

echo "PASS: worker-clickhouse-down (${COUNT}/${COUNT} events self-healed with zero worker restarts)"
