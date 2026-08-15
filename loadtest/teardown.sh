#!/usr/bin/env bash
set -euo pipefail

# Deletes everything provision.sh (and the k6 scenarios' own event
# traffic) created. Postgres side follows testHelpers/auth.ts's
# cleanupTestPrincipal() order for real — auth_sessions before users
# (a real FK violation this codebase already hit once), memberships
# before both users and organizations, projects before organizations.
# ClickHouse has no FK to violate, but leaving load-test events behind
# would pollute any real investigation dashboard pointed at this same
# local instance.

DATABASE_URL="${DATABASE_URL:-postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch}"
CLICKHOUSE_HTTP_ADDR="${CLICKHOUSE_HTTP_ADDR:-localhost:8123}"
CLICKHOUSE_USERNAME="${CLICKHOUSE_USERNAME:-frontwatch}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-frontwatch_dev}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-frontwatch}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_FILE="$SCRIPT_DIR/.session"

if [[ ! -f "$SESSION_FILE" ]]; then
	echo "no $SESSION_FILE — nothing to tear down" >&2
	exit 0
fi

# shellcheck disable=SC1090
source "$SESSION_FILE"

echo "== deleting ClickHouse events for project $PROJECT_ID =="
curl -sS "http://${CLICKHOUSE_HTTP_ADDR}/?database=${CLICKHOUSE_DATABASE}" \
	--user "${CLICKHOUSE_USERNAME}:${CLICKHOUSE_PASSWORD}" \
	--data-binary "ALTER TABLE events DELETE WHERE project_id = '${PROJECT_ID}'" >/dev/null

echo "== deleting Postgres rows (projects, auth_sessions, memberships, users, organizations) =="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
DELETE FROM projects WHERE id = '${PROJECT_ID}';
DELETE FROM auth_sessions WHERE user_id = '${USER_ID}';
DELETE FROM memberships WHERE user_id = '${USER_ID}';
DELETE FROM users WHERE id = '${USER_ID}';
DELETE FROM organizations WHERE id = '${ORGANIZATION_ID}';
SQL

rm -f "$SESSION_FILE"
echo "== teardown complete =="
