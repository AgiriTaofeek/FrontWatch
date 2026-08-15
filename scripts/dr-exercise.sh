#!/usr/bin/env bash
set -uo pipefail
# (not -e: a failed validation should still produce the final report,
# not abort silently mid-exercise.)

# A real disaster recovery exercise — infrastructure.md's "run recovery
# exercises periodically, not only when something has already gone
# wrong," made real rather than only documented (Step 9, PROGRESS.md).
# Goes further than scripts/verify-postgres-backup.sh (which restores
# into an isolated `_restore_test` database and only compares row
# counts): this script actually destroys the real local Postgres
# container and its volume — a genuine "storage failure"/"cluster
# loss" scenario, one of infrastructure.md's named disaster-recovery
# scenarios — then executes the full documented recovery sequence
# (docs/08-operations-release/runbooks/postgres-backup-restore.md's
# "real recovery" procedure) against the real local dev stack and
# validates ingestion, queries, and alert data all actually work
# afterward. Confirmed with the user before running: local dev data
# only, low-stakes, easily recreated — never point this at anything
# else.
#
# What this deliberately demonstrates, not just backup/restore
# mechanics: a real RPO gap. Data created *after* the backup is
# provably gone afterward — this script asserts that specifically,
# not just that *some* data survived.
#
# ClickHouse is untouched throughout — telemetry backup is explicitly
# out-of-scope (documented in the runbook and PROGRESS.md's Step 8
# entry), a real separate policy decision this project hasn't made
# yet. This exercise proves the control-plane recovers and the
# pipeline it gates (ingestion -> worker -> ClickHouse) works again
# once it does, not that telemetry itself survives a Postgres loss
# (it was never at risk from one).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTROL_API_URL="${CONTROL_API_URL:-http://localhost:3000}"
INGESTION_URL="${INGESTION_URL:-http://localhost:8080}"
DATABASE_URL="${DATABASE_URL:-postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch}"
CLICKHOUSE_HTTP_ADDR="${CLICKHOUSE_HTTP_ADDR:-localhost:8123}"
CLICKHOUSE_USERNAME="${CLICKHOUSE_USERNAME:-frontwatch}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-frontwatch_dev}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-frontwatch}"
COMPOSE_FILE="$REPO_ROOT/infra/local/docker-compose.yml"
# See backup-postgres.sh's own comment: point this at version-matched
# client tools if the Homebrew default is a newer major version than
# the docker-compose Postgres server (postgres:16) — confirmed a real,
# recurring mismatch on this machine (Homebrew defaults to 17).
PG_BIN_DIR="${PG_BIN_DIR:-}"
PSQL="${PG_BIN_DIR:+$PG_BIN_DIR/}psql"

PASS=0
FAIL=0
check() {
	local description="$1"
	local ok="$2"
	if [[ "$ok" == "0" ]]; then
		echo "  [ok]   $description"
		PASS=$((PASS + 1))
	else
		echo "  [FAIL] $description"
		FAIL=$((FAIL + 1))
	fi
}

echo "############################################################"
echo "# Disaster Recovery Exercise — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "############################################################"

echo
echo "== Phase 0: seed baseline data (survives the disaster, per the backup) =="
"$REPO_ROOT/loadtest/provision.sh"
# shellcheck disable=SC1091
source "$REPO_ROOT/loadtest/.session"
BASELINE_ORG_ID="$ORGANIZATION_ID"
BASELINE_PROJECT_ID="$PROJECT_ID"
BASELINE_PUBLIC_KEY="$PUBLIC_KEY"
BASELINE_SESSION_COOKIE="$SESSION_COOKIE"
BASELINE_USER_ID="$USER_ID"

ALERT_RULE_BODY="$(curl -sS -X POST "$CONTROL_API_URL/api/v1/projects/$BASELINE_PROJECT_ID/alert-rules" \
	-H "Content-Type: application/json" -H "Cookie: fw_session=${BASELINE_SESSION_COOKIE}" \
	-d '{"type":"new_issue","webhookUrl":"https://example.com/dr-exercise-webhook"}')"
BASELINE_ALERT_RULE_ID="$(echo "$ALERT_RULE_BODY" | jq -r '.id')"
echo "  baseline org=$BASELINE_ORG_ID project=$BASELINE_PROJECT_ID alert_rule=$BASELINE_ALERT_RULE_ID"

echo
echo "== Phase 1: take the backup (this is the RPO boundary) =="
BACKUP_OUTPUT="$(DATABASE_URL="$DATABASE_URL" PG_BIN_DIR="$PG_BIN_DIR" "$REPO_ROOT/scripts/backup-postgres.sh")"
echo "  $BACKUP_OUTPUT"
DUMP_FILE="$(echo "$BACKUP_OUTPUT" | sed -n 's/^backed up to \([^ ]*\).*/\1/p')"
BACKUP_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo
echo "== Phase 2: create data AFTER the backup — this is expected to be lost =="
POST_BACKUP_PROJECT_BODY="$(curl -sS -X POST "$CONTROL_API_URL/api/v1/projects" \
	-H "Content-Type: application/json" -H "Cookie: fw_session=${BASELINE_SESSION_COOKIE}" \
	-d "{\"organizationId\":\"${BASELINE_ORG_ID}\"}")"
POST_BACKUP_PROJECT_ID="$(echo "$POST_BACKUP_PROJECT_BODY" | jq -r '.id')"
echo "  post-backup project=$POST_BACKUP_PROJECT_ID (created ${BACKUP_TIME} < now — inside the RPO gap)"

echo
echo "############################################################"
echo "# DISASTER: destroying the real local Postgres container + volume"
echo "############################################################"
DISASTER_START="$(date +%s)"

echo "== declaring recovery mode: stopping control-api / ingestion / worker =="
pkill -f "bun --watch src/index.ts" 2>/dev/null || true
pkill -9 -f "go-build.*ingestion$" 2>/dev/null || true
pkill -9 -f "go-build.*worker$" 2>/dev/null || true
sleep 1

echo "== simulating storage/cluster loss: stopping Postgres and destroying its volume =="
docker compose -f "$COMPOSE_FILE" stop postgres
docker compose -f "$COMPOSE_FILE" rm -f postgres
# The compose project is named "local" (infra/local/docker-compose.yml,
# containers are local-postgres-1 etc.) — Compose names volumes
# <project>_<volume-key>, confirmed via `docker volume ls` rather than
# assumed, since guessing wrong here would silently no-op and this
# script's whole point is to actually destroy the data.
docker volume rm local_postgres_data
echo "  Postgres container and volume are gone — this is a real, unrecoverable-without-backup state"

echo
echo "############################################################"
echo "# RECOVERY"
echo "############################################################"

echo "== restoring infrastructure: recreating the Postgres container (fresh, empty) =="
docker compose -f "$COMPOSE_FILE" up -d postgres
for _ in $(seq 1 30); do
	status="$(docker inspect --format '{{.State.Health.Status}}' local-postgres-1 2>/dev/null || echo "starting")"
	[[ "$status" == "healthy" ]] && break
	sleep 1
done
echo "  postgres container status: $(docker inspect --format '{{.State.Health.Status}}' local-postgres-1 2>/dev/null)"

echo "== restoring control data from the Phase 1 backup =="
ALLOW_UNSAFE_RESTORE_TARGET=1 PG_BIN_DIR="$PG_BIN_DIR" "$REPO_ROOT/scripts/restore-postgres.sh" "$DUMP_FILE" "$DATABASE_URL"

echo "== starting services =="
(cd "$REPO_ROOT/apps/control-api" && DATABASE_URL="$DATABASE_URL" nohup bun --watch src/index.ts >/tmp/dr-control-api.log 2>&1 &)
sleep 2
(cd "$REPO_ROOT/services/data-plane" && DATABASE_URL="$DATABASE_URL" REDPANDA_BROKERS="localhost:19092" PORT="8080" \
	nohup go run ./cmd/ingestion >/tmp/dr-ingestion.log 2>&1 &)
sleep 1
(cd "$REPO_ROOT/services/data-plane" && CLICKHOUSE_ADDR="localhost:9000" CLICKHOUSE_DATABASE="$CLICKHOUSE_DATABASE" \
	CLICKHOUSE_USERNAME="$CLICKHOUSE_USERNAME" CLICKHOUSE_PASSWORD="$CLICKHOUSE_PASSWORD" REDPANDA_BROKERS="localhost:19092" \
	nohup go run ./cmd/worker >/tmp/dr-worker.log 2>&1 &)
echo "  waiting for services to come up..."
sleep 10

echo
echo "############################################################"
echo "# VALIDATION"
echo "############################################################"

CONTROL_API_READY="$(curl -s -o /dev/null -w "%{http_code}" "$CONTROL_API_URL/health/ready")"
check "control-api /health/ready is up" "$([[ "$CONTROL_API_READY" == "200" ]] && echo 0 || echo 1)"

INGESTION_READY="$(curl -s -o /dev/null -w "%{http_code}" "$INGESTION_URL/health/ready")"
check "ingestion /health/ready is up" "$([[ "$INGESTION_READY" == "200" ]] && echo 0 || echo 1)"

WORKER_READY="$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8081/health/ready")"
check "worker /health/ready is up" "$([[ "$WORKER_READY" == "200" ]] && echo 0 || echo 1)"

QUERY_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$CONTROL_API_URL/api/v1/projects/$BASELINE_PROJECT_ID" \
	-H "Cookie: fw_session=${BASELINE_SESSION_COOKIE}")"
check "pre-backup project is queryable (control data survived)" "$([[ "$QUERY_STATUS" == "200" ]] && echo 0 || echo 1)"

ALERT_RULE_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$CONTROL_API_URL/api/v1/alert-rules/$BASELINE_ALERT_RULE_ID" \
	-H "Cookie: fw_session=${BASELINE_SESSION_COOKIE}")"
check "pre-backup alert rule survived and is queryable" "$([[ "$ALERT_RULE_STATUS" == "200" ]] && echo 0 || echo 1)"

POST_BACKUP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$CONTROL_API_URL/api/v1/projects/$POST_BACKUP_PROJECT_ID" \
	-H "Cookie: fw_session=${BASELINE_SESSION_COOKIE}")"
check "post-backup project is genuinely gone (real RPO gap, not a false-confidence check)" "$([[ "$POST_BACKUP_STATUS" == "404" ]] && echo 0 || echo 1)"

DR_EVENT_ID="evt_dr_exercise_$(date +%s)"
INGEST_STATUS="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$INGESTION_URL/ingest/v1/events" \
	-H "Authorization: Bearer ${BASELINE_PUBLIC_KEY}" -H "Content-Type: application/json" \
	-d "{\"schema_version\":1,\"sent_at\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"events\":[{\"event_id\":\"${DR_EVENT_ID}\",\"event_type\":\"error\",\"schema_version\":1,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"payload\":{\"message\":\"dr exercise\",\"exception_type\":\"E\",\"handled\":false}}]}")"
check "ingestion accepts new telemetry (credential check against restored Postgres works)" "$([[ "$INGEST_STATUS" == "200" ]] && echo 0 || echo 1)"

CH_LANDED=0
for _ in $(seq 1 15); do
	COUNT="$(curl -s "http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
		--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
		--data-binary "SELECT count() FROM events WHERE event_id = '${DR_EVENT_ID}'")"
	[[ "$COUNT" == "1" ]] && CH_LANDED=1 && break
	sleep 2
done
check "the new event reached ClickHouse (full ingestion->worker->storage pipeline works post-recovery)" "$([[ "$CH_LANDED" == "1" ]] && echo 0 || echo 1)"

DISASTER_END="$(date +%s)"
RTO_SECONDS="$((DISASTER_END - DISASTER_START))"

echo
echo "############################################################"
echo "# REPORT"
echo "############################################################"
echo "RTO (disaster declared -> fully validated): ${RTO_SECONDS}s"
echo "RPO demonstrated: backup taken at ${BACKUP_TIME}; project ${POST_BACKUP_PROJECT_ID}"
echo "  (created after that backup) did not survive — everything after the backup is the loss window."
echo "Validations: ${PASS} passed, ${FAIL} failed"

echo
echo "== cleanup: removing this exercise's own seed data =="
curl -s "http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
	--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
	--data-binary "ALTER TABLE events DELETE WHERE event_id = '${DR_EVENT_ID}'" >/dev/null
"$PSQL" "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL >/dev/null
DELETE FROM alert_rules WHERE project_id = '${BASELINE_PROJECT_ID}';
DELETE FROM projects WHERE id = '${BASELINE_PROJECT_ID}';
DELETE FROM auth_sessions WHERE user_id = '${BASELINE_USER_ID}';
DELETE FROM memberships WHERE user_id = '${BASELINE_USER_ID}';
DELETE FROM users WHERE id = '${BASELINE_USER_ID}';
DELETE FROM organizations WHERE id = '${BASELINE_ORG_ID}';
SQL
rm -f "$REPO_ROOT/loadtest/.session"
echo "  done"

exit "$FAIL"
