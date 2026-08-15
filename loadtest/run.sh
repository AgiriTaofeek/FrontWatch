#!/usr/bin/env bash
set -euo pipefail

# Orchestrates a full load-testing pass against a live local stack —
# operations.md's Load testing spec in one runnable script rather than
# several manual steps: provision → ingestion traffic-pattern run →
# query latency under concurrent write pressure → wait for the queue
# to fully drain → processing-correctness check → teardown. Not part
# of CI (same reasoning as scripts/backup-postgres.sh not being
# CI-invoked): it needs the full stack up (Postgres + ClickHouse +
# Redpanda + both Go binaries + control-api), takes several minutes,
# and is inherently a point-in-time operational measurement, not a
# pass/fail correctness check.
#
# Teardown MUST wait for a full queue drain, not a bounded grace
# period — a real bug hit while building this script, not a
# hypothetical one: an earlier version deleted the ClickHouse project
# rows (and the Postgres project/org) after only a 30s wait, while
# cmd/worker's single-record-at-a-time processing (see
# ingestion.js's own comment on the ~200-250 events/sec ceiling this
# discovered) was still ~150k events behind. The worker kept
# processing and re-inserting rows under that now-deleted project_id
# for several more minutes after "teardown complete" had already
# printed — orphaned data outliving its own cleanup. See [4/6] below.
#
# Prerequisites: infra/local/docker-compose.yml up, ingestion +
# worker + control-api running (see loadtest/README.md), k6 and jq on
# PATH, DATABASE_URL/CLICKHOUSE_* set the same way the services
# themselves are configured (apps/control-api/.env's values are the
# defaults below).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RESULTS_DIR"

CONTROL_API_URL="${CONTROL_API_URL:-http://localhost:3000}"
INGESTION_URL="${INGESTION_URL:-http://localhost:8080}"
DATABASE_URL="${DATABASE_URL:-postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch}"
CLICKHOUSE_HTTP_ADDR="${CLICKHOUSE_HTTP_ADDR:-localhost:8123}"
CLICKHOUSE_USERNAME="${CLICKHOUSE_USERNAME:-frontwatch}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-frontwatch_dev}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-frontwatch}"
REDPANDA_CONTAINER="${REDPANDA_CONTAINER:-local-redpanda-1}"
# How long to wait for the queue to fully drain before giving up and
# tearing down anyway (with a loud warning, not a silent skip). 10
# minutes comfortably covers this scenario's reduced event volume at
# the ~200-250 events/sec ceiling found during development.
DRAIN_TIMEOUT_S="${DRAIN_TIMEOUT_S:-600}"
export DATABASE_URL CLICKHOUSE_HTTP_ADDR CLICKHOUSE_USERNAME CLICKHOUSE_PASSWORD CLICKHOUSE_DATABASE

queue_lag() {
	docker exec "$REDPANDA_CONTAINER" rpk group describe telemetry-worker 2>/dev/null \
		| awk '$1 == "TOTAL-LAG" { print $2 }'
}

echo "== [1/6] provisioning a real org/project ==" >&2
CONTROL_API_URL="$CONTROL_API_URL" "$SCRIPT_DIR/provision.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/.session"
export PUBLIC_KEY PROJECT_ID SESSION_COOKIE

cleanup() {
	echo "== tearing down ==" >&2
	DATABASE_URL="$DATABASE_URL" \
		CLICKHOUSE_HTTP_ADDR="$CLICKHOUSE_HTTP_ADDR" \
		CLICKHOUSE_USERNAME="$CLICKHOUSE_USERNAME" \
		CLICKHOUSE_PASSWORD="$CLICKHOUSE_PASSWORD" \
		CLICKHOUSE_DATABASE="$CLICKHOUSE_DATABASE" \
		"$SCRIPT_DIR/teardown.sh" || true
}
trap cleanup EXIT

echo "== [2/6] ingestion traffic-pattern run (normal -> peak -> spike -> sustained -> recovery) ==" >&2
INGESTION_URL="$INGESTION_URL" PUBLIC_KEY="$PUBLIC_KEY" k6 run \
	--summary-export="$RESULTS_DIR/ingestion-${STAMP}.json" \
	"$SCRIPT_DIR/scenarios/ingestion.js" | tee "$RESULTS_DIR/ingestion-${STAMP}.log"

INGESTION_ACCEPTED="$(jq -r '.metrics.fw_events_accepted.count // 0' "$RESULTS_DIR/ingestion-${STAMP}.json")"
echo "== ingestion run accepted ${INGESTION_ACCEPTED} events (per-event acks, not batch count) ==" >&2
echo "== queue lag immediately after the spike (expected to be well behind — that's the finding) ==" >&2
docker exec "$REDPANDA_CONTAINER" rpk group describe telemetry-worker \
	| tee "$RESULTS_DIR/queue-lag-after-spike-${STAMP}.txt" >&2 || true

echo "== [3/6] query latency under concurrent background write load ==" >&2
INGESTION_URL="$INGESTION_URL" PUBLIC_KEY="$PUBLIC_KEY" DURATION=90s VUS=15 \
	k6 run --summary-export="$RESULTS_DIR/sustained-ingest-${STAMP}.json" \
	"$SCRIPT_DIR/scenarios/sustained-ingest.js" \
	>"$RESULTS_DIR/sustained-ingest-${STAMP}.log" 2>&1 &
BG_PID=$!

CONTROL_API_URL="$CONTROL_API_URL" PROJECT_ID="$PROJECT_ID" SESSION_COOKIE="$SESSION_COOKIE" k6 run \
	--summary-export="$RESULTS_DIR/query-${STAMP}.json" \
	"$SCRIPT_DIR/scenarios/query.js" | tee "$RESULTS_DIR/query-${STAMP}.log"

wait "$BG_PID" || true
SUSTAINED_ACCEPTED="$(jq -r '.metrics.fw_events_accepted.count // 0' "$RESULTS_DIR/sustained-ingest-${STAMP}.json" 2>/dev/null || echo 0)"
TOTAL_ACCEPTED=$((INGESTION_ACCEPTED + SUSTAINED_ACCEPTED))

echo "== [4/6] waiting up to ${DRAIN_TIMEOUT_S}s for the worker to fully drain the queue ==" >&2
echo "   (teardown must not run against a project the worker is still writing to — see this script's own header comment)" >&2
ELAPSED=0
while true; do
	LAG="$(queue_lag)"
	echo "  t+${ELAPSED}s lag=${LAG:-unknown}"
	if [[ "${LAG:-1}" -le 0 ]]; then
		echo "  drained"
		break
	fi
	if [[ "$ELAPSED" -ge "$DRAIN_TIMEOUT_S" ]]; then
		echo "  !! gave up waiting after ${DRAIN_TIMEOUT_S}s with lag=${LAG:-unknown} — tearing down anyway." >&2
		echo "  !! the worker will keep writing events for this now-deleted project after this run exits;" >&2
		echo "  !! re-run loadtest/teardown.sh manually (or purge project_id=${PROJECT_ID} from ClickHouse) once it catches up." >&2
		break
	fi
	sleep 5
	ELAPSED=$((ELAPSED + 5))
done

echo "== [5/6] processing correctness: ClickHouse row count vs. total k6-reported accepted ==" >&2
STORED="$(curl -sS "http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
	--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
	--data-binary "SELECT count() FROM events WHERE project_id = '${PROJECT_ID}'")"
echo "  ingestion run accepted:   ${INGESTION_ACCEPTED}"
echo "  sustained-ingest accepted: ${SUSTAINED_ACCEPTED}"
echo "  total accepted:            ${TOTAL_ACCEPTED}"
echo "  ClickHouse row count:      ${STORED}"

echo "== [6/6] done — results in ${RESULTS_DIR} (${STAMP}) ==" >&2
