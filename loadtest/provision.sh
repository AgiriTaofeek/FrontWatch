#!/usr/bin/env bash
set -euo pipefail

# Provisions exactly what a k6 run needs: a real organization, a real
# administrator session, and a real project (with the public key
# ingestion authenticates against) — through the actual HTTP routes
# (/auth/register, POST /projects), the same path a real signup takes.
# No shortcut inserts: RBAC enforcement (Step 9) means a bare
# randomUUID() project no longer gets past authorizeProjectAccess, and
# ingestion validates the public key against a real Postgres row
# (internal/storage/postgres.ProjectCredentialRepository) — a fake key
# would just measure how fast the platform rejects load, not how it
# handles it.
#
# Writes loadtest/.session (KEY=VALUE, no `export`) for the k6
# scenarios and teardown.sh to source. Not committed — see .gitignore.

CONTROL_API_URL="${CONTROL_API_URL:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_FILE="$SCRIPT_DIR/.session"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

STAMP="$(date +%s)"
EMAIL="loadtest_${STAMP}@example.com"
ORG_NAME="Load Test Org ${STAMP}"

echo "== registering ${ORG_NAME} / ${EMAIL} =="
REGISTER_BODY="$(curl -sS -c "$COOKIE_JAR" -X POST "$CONTROL_API_URL/api/v1/auth/register" \
	-H "Content-Type: application/json" \
	-d "{\"organizationName\":\"${ORG_NAME}\",\"email\":\"${EMAIL}\",\"name\":\"Load Test Admin\",\"password\":\"a-fine-load-test-password\"}")"

ORGANIZATION_ID="$(echo "$REGISTER_BODY" | jq -r '.organizationId')"
USER_ID="$(echo "$REGISTER_BODY" | jq -r '.userId')"
if [[ "$ORGANIZATION_ID" == "null" || -z "$ORGANIZATION_ID" ]]; then
	echo "registration failed: $REGISTER_BODY" >&2
	exit 1
fi

SESSION_COOKIE="$(grep fw_session "$COOKIE_JAR" | awk '{print $NF}')"
if [[ -z "$SESSION_COOKIE" ]]; then
	echo "no fw_session cookie in response" >&2
	exit 1
fi

echo "== creating project in org $ORGANIZATION_ID =="
PROJECT_BODY="$(curl -sS -X POST "$CONTROL_API_URL/api/v1/projects" \
	-H "Content-Type: application/json" \
	-H "Cookie: fw_session=${SESSION_COOKIE}" \
	-d "{\"organizationId\":\"${ORGANIZATION_ID}\"}")"

PROJECT_ID="$(echo "$PROJECT_BODY" | jq -r '.id')"
PUBLIC_KEY="$(echo "$PROJECT_BODY" | jq -r '.publicKey')"
if [[ "$PROJECT_ID" == "null" || -z "$PROJECT_ID" ]]; then
	echo "project creation failed: $PROJECT_BODY" >&2
	exit 1
fi

cat >"$SESSION_FILE" <<EOF
ORGANIZATION_ID=${ORGANIZATION_ID}
USER_ID=${USER_ID}
PROJECT_ID=${PROJECT_ID}
PUBLIC_KEY=${PUBLIC_KEY}
SESSION_COOKIE=${SESSION_COOKIE}
EOF

echo "== provisioned =="
cat "$SESSION_FILE"
