#!/usr/bin/env bash
set -euo pipefail

# US-16.03 "Configure Retention" — the real, operator-facing half of
# it. migrations/clickhouse/0002_events_retention_ttl sets a documented
# 90-day default at deploy time; this script is how an operator
# actually changes that for their own organization's requirements
# afterward, without hand-writing ClickHouse DDL or needing
# clickhouse-client installed (curl against the HTTP interface instead
# — same interface CI's own healthcheck already talks to, no extra
# dependency to ship or document).
#
# TTL, not a DELETE loop: ClickHouse's own background merge process
# physically drops aged-out data (the events table is partitioned by
# toDate(client_timestamp), so a whole partition can be dropped
# directly once entirely expired) — "expired telemetry is removed
# according to policy" without this script (or anything else) needing
# to run on a schedule.
#
# Scope, deliberately: this only touches the events table — the one
# place SDK telemetry actually lands. Postgres control-plane data
# (projects/releases/alert_rules/alert_events) isn't telemetry
# (data-model.md's own classification) and has no retention policy of
# its own yet, unchanged by this script.

usage() {
	echo "usage: DAYS=<n> $0" >&2
	echo "  env: CLICKHOUSE_HTTP_ADDR (default localhost:8123), CLICKHOUSE_USERNAME, CLICKHOUSE_PASSWORD, CLICKHOUSE_DATABASE (default frontwatch)" >&2
	exit 1
}

DAYS="${DAYS:?DAYS is not set — how many days of telemetry to retain}"
case "$DAYS" in
'' | *[!0-9]*)
	echo "DAYS must be a positive integer, got: $DAYS" >&2
	usage
	;;
esac

CLICKHOUSE_HTTP_ADDR="${CLICKHOUSE_HTTP_ADDR:-localhost:8123}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-frontwatch}"
CLICKHOUSE_USERNAME="${CLICKHOUSE_USERNAME:-frontwatch}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:?CLICKHOUSE_PASSWORD is not set}"

# toDate(client_timestamp), not the raw column — confirmed directly
# against a real ClickHouse instance, not assumed: a TTL expression
# must resolve to Date or DateTime, and rejects DateTime64 outright
# (BAD_TTL_EXPRESSION). Same expression the table is already
# partitioned by (PARTITION BY toDate(client_timestamp)), matching
# migrations/clickhouse/0002_events_retention_ttl.up.sql exactly.
SQL="ALTER TABLE events MODIFY TTL toDate(client_timestamp) + INTERVAL ${DAYS} DAY"

echo "Setting events retention to ${DAYS} day(s) on ${CLICKHOUSE_HTTP_ADDR}/${CLICKHOUSE_DATABASE}..."
curl -sS -f \
	--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
	"http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
	--data-binary "$SQL"

echo "Done. ClickHouse applies this in the background during its next merge — existing aged-out data isn't deleted instantly, but no new merge will keep it past the new policy."
