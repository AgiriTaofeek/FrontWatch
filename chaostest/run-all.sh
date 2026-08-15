#!/usr/bin/env bash
set -uo pipefail
# (not -e: a scenario failing shouldn't abort the rest of the suite or
# skip teardown — collected and reported at the end instead.)

# Runs every Failure recovery scenario (Step 9, PROGRESS.md) against a
# live local stack — provisions one real project (reusing loadtest's
# own provision.sh/teardown.sh, no need for a second implementation),
# runs each dependency-outage scenario in turn, tears down, and prints
# a pass/fail summary. Same operational-tooling status as
# loadtest/run.sh and scripts/backup-postgres.sh — not a CI gate: it
# stops and restarts real Docker containers, which nothing in CI runs
# against.
#
# Prerequisites: infra/local/docker-compose.yml up, ingestion + worker
# + control-api running (see loadtest/README.md — the same
# prerequisites apply here), docker CLI on PATH with permission to
# control the local-{postgres,clickhouse,redpanda}-1 containers.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONTROL_API_URL="${CONTROL_API_URL:-http://localhost:3000}"
INGESTION_URL="${INGESTION_URL:-http://localhost:8080}"
DATABASE_URL="${DATABASE_URL:-postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch}"
CLICKHOUSE_HTTP_ADDR="${CLICKHOUSE_HTTP_ADDR:-localhost:8123}"
CLICKHOUSE_USERNAME="${CLICKHOUSE_USERNAME:-frontwatch}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-frontwatch_dev}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-frontwatch}"
export DATABASE_URL CLICKHOUSE_HTTP_ADDR CLICKHOUSE_USERNAME CLICKHOUSE_PASSWORD CLICKHOUSE_DATABASE

echo "== provisioning a real org/project (reusing loadtest/provision.sh) ==" >&2
CONTROL_API_URL="$CONTROL_API_URL" "$REPO_ROOT/loadtest/provision.sh"
# shellcheck disable=SC1091
source "$REPO_ROOT/loadtest/.session"
export PUBLIC_KEY PROJECT_ID SESSION_COOKIE

cleanup() {
	echo "== tearing down ==" >&2
	DATABASE_URL="$DATABASE_URL" \
		CLICKHOUSE_HTTP_ADDR="$CLICKHOUSE_HTTP_ADDR" \
		CLICKHOUSE_USERNAME="$CLICKHOUSE_USERNAME" \
		CLICKHOUSE_PASSWORD="$CLICKHOUSE_PASSWORD" \
		CLICKHOUSE_DATABASE="$CLICKHOUSE_DATABASE" \
		"$REPO_ROOT/loadtest/teardown.sh" || true
}
trap cleanup EXIT

declare -a RESULTS=()
run_scenario() {
	local name="$1"
	shift
	echo
	echo "########## $name ##########" >&2
	if INGESTION_URL="$INGESTION_URL" CONTROL_API_URL="$CONTROL_API_URL" \
		CLICKHOUSE_HTTP_ADDR="$CLICKHOUSE_HTTP_ADDR" CLICKHOUSE_USERNAME="$CLICKHOUSE_USERNAME" \
		CLICKHOUSE_PASSWORD="$CLICKHOUSE_PASSWORD" CLICKHOUSE_DATABASE="$CLICKHOUSE_DATABASE" \
		PUBLIC_KEY="$PUBLIC_KEY" PROJECT_ID="$PROJECT_ID" SESSION_COOKIE="$SESSION_COOKIE" \
		"$@"; then
		RESULTS+=("PASS  $name")
	else
		RESULTS+=("FAIL  $name")
	fi
}

run_scenario "ingestion + Postgres down"   "$SCRIPT_DIR/scenarios/ingestion-postgres-down.sh"
run_scenario "ingestion + Redpanda down"   "$SCRIPT_DIR/scenarios/ingestion-redpanda-down.sh"
run_scenario "worker + ClickHouse down"    "$SCRIPT_DIR/scenarios/worker-clickhouse-down.sh"
run_scenario "control-api + Postgres down"   "$SCRIPT_DIR/scenarios/control-api-dependency-down.sh" postgres
run_scenario "control-api + ClickHouse down" "$SCRIPT_DIR/scenarios/control-api-dependency-down.sh" clickhouse

echo
echo "========== SUMMARY =========="
FAILED=0
for line in "${RESULTS[@]}"; do
	echo "$line"
	[[ "$line" == FAIL* ]] && FAILED=1
done

exit "$FAILED"
