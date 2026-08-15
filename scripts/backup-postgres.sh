#!/usr/bin/env bash
set -euo pipefail

# Step 8 (infrastructure.md): "back up PostgreSQL, configuration,
# alert definitions, identity/configuration metadata" — the control
# plane's entire state (projects, alert_rules, alert_events, releases;
# ADR-020/021) lives in this one Postgres database, so backing it up
# covers everything infrastructure.md names for this slice in one
# dump. ClickHouse telemetry backup is deliberately out of scope here
# — infrastructure.md itself notes "telemetry backup policy depends on
# retention/durability requirements," a real separate policy decision
# this project hasn't made yet (PROGRESS.md tracks it as deferred, not
# forgotten), not an oversight.
#
# Custom format (-Fc), not a plain .sql dump: it's what makes
# restore-postgres.sh's --clean/--if-exists (and, at real scale,
# pg_restore's parallel restore) possible — the standard choice for
# anything beyond a toy dump.
#
# A backup nobody has ever restored isn't a backup — see
# verify-postgres-backup.sh, which exercises this script for real
# against an isolated database rather than trusting that pg_dump
# "probably worked."
#
# PG_BIN_DIR: point this at version-matched client tools if your
# default pg_dump is a newer major version than the server (this
# repo's docker-compose runs postgres:16). Confirmed hitting this for
# real: Homebrew's default pg_dump (17) embeds a `SET
# transaction_timeout = 0;` preamble a 16 server's pg_restore doesn't
# understand — a genuine client/server incompatibility, not a bug in
# these scripts. e.g. PG_BIN_DIR="$(brew --prefix postgresql@16)/bin".

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is not set}"
BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/frontwatch_${TIMESTAMP}.dump"
PG_DUMP="${PG_BIN_DIR:+$PG_BIN_DIR/}pg_dump"

mkdir -p "$BACKUP_DIR"
"$PG_DUMP" "$DATABASE_URL" -Fc -f "$OUTPUT_FILE"

echo "backed up to $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
