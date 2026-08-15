#!/usr/bin/env bash
set -euo pipefail

# Shared helper: stop/start one dependency container from
# infra/local/docker-compose.yml and wait for its healthcheck to
# settle, so scenario scripts can express "take Postgres down for real
# and wait for it to actually be down" without each reimplementing the
# polling loop. `docker compose stop`/`start` (not `pause`/`unpause` or
# `kill`) — a real graceful stop is what a scenario like "the database
# had a planned restart" or "the container crashed and was
# restarted by the orchestrator" actually looks like; the container's
# own healthcheck is the source of truth for "is it actually usable
# yet," not just "did the process start."
#
# Usage: toggle.sh <stop|start> <postgres|clickhouse|redpanda> [timeout_seconds]

COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/infra/local/docker-compose.yml"
ACTION="${1:?usage: toggle.sh <stop|start> <postgres|clickhouse|redpanda> [timeout_seconds]}"
SERVICE="${2:?usage: toggle.sh <stop|start> <postgres|clickhouse|redpanda> [timeout_seconds]}"
TIMEOUT="${3:-60}"

case "$SERVICE" in
	postgres | clickhouse | redpanda) ;;
	*)
		echo "unknown service: $SERVICE (expected postgres, clickhouse, or redpanda)" >&2
		exit 1
		;;
esac

container="local-${SERVICE}-1"

wait_for_health() {
	local want="$1" # "healthy" or "not-running"
	local elapsed=0
	while [[ "$elapsed" -lt "$TIMEOUT" ]]; do
		# .State.Status ("running"/"exited") answers "is it up at all";
		# .State.Health.Status only means something while running — a
		# stopped container reports "unhealthy" there too (confirmed
		# empirically), which would make a naive health-only check
		# think a fully-stopped container is still "up but unhealthy"
		# instead of "down".
		container_status="$(docker inspect --format '{{.State.Status}}' "$container" 2>/dev/null || echo "not-running")"
		if [[ "$want" == "not-running" ]]; then
			if [[ "$container_status" != "running" ]]; then
				return 0
			fi
		elif [[ "$want" == "healthy" ]]; then
			health="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")"
			if [[ "$container_status" == "running" && "$health" == "healthy" ]]; then
				return 0
			fi
		fi
		sleep 1
		elapsed=$((elapsed + 1))
	done
	echo "timed out after ${TIMEOUT}s waiting for $container to be $want (last status: ${container_status:-unknown}, health: ${health:-n/a})" >&2
	return 1
}

case "$ACTION" in
	stop)
		echo "== stopping $SERVICE ($container) ==" >&2
		docker compose -f "$COMPOSE_FILE" stop "$SERVICE" >&2
		wait_for_health "not-running"
		echo "== $SERVICE is down ==" >&2
		;;
	start)
		echo "== starting $SERVICE ($container) ==" >&2
		docker compose -f "$COMPOSE_FILE" start "$SERVICE" >&2
		wait_for_health "healthy"
		echo "== $SERVICE is healthy ==" >&2
		;;
	*)
		echo "unknown action: $ACTION (expected stop or start)" >&2
		exit 1
		;;
esac
