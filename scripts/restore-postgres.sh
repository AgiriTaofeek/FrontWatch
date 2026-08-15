#!/usr/bin/env bash
set -euo pipefail

# usage: restore-postgres.sh <dump-file> [target-database-url]
#
# infrastructure.md: "A backup is not valid until restoration has been
# tested: backup → isolated environment → restore → integrity checks →
# application validation." This script is that "isolated environment"
# step — it refuses, by default, to restore into anything that isn't
# obviously a throwaway verification database. Restoring over a real
# live database is a deliberate, separate, documented emergency
# recovery procedure (docs/08-operations-release/runbooks/
# postgres-backup-restore.md), not this script's default behavior —
# release-strategy.md's rollback discipline applies here too: an
# irreversible action shouldn't be one flag away from an ordinary
# script invocation.

# PG_BIN_DIR: see backup-postgres.sh's own comment — point this at
# version-matched client tools if pg_restore errors on a preamble
# statement the target server's version doesn't recognize (e.g.
# `unrecognized configuration parameter "transaction_timeout"`).

DUMP_FILE="${1:?usage: restore-postgres.sh <dump-file> [target-database-url]}"
TARGET_URL="${2:-postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch_restore_test}"
PSQL="${PG_BIN_DIR:+$PG_BIN_DIR/}psql"
PG_RESTORE="${PG_BIN_DIR:+$PG_BIN_DIR/}pg_restore"

if [[ "$TARGET_URL" != *"_restore_test"* && "${ALLOW_UNSAFE_RESTORE_TARGET:-}" != "1" ]]; then
	echo "refusing to restore into a database whose name doesn't contain '_restore_test'" >&2
	echo "(set ALLOW_UNSAFE_RESTORE_TARGET=1 to override for a deliberate real recovery — see the runbook first)" >&2
	exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
	echo "dump file not found: $DUMP_FILE" >&2
	exit 1
fi

# pg_restore restores a dump's *contents* into an existing database —
# it doesn't create the database itself. Connect to the server's own
# `postgres` maintenance database to (re)create the target as a clean
# slate before restoring into it, so this script is safely re-runnable
# against the same target.
DB_NAME="${TARGET_URL##*/}"
ADMIN_URL="${TARGET_URL%/*}/postgres"

"$PSQL" "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
"$PSQL" "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\";"

"$PG_RESTORE" "$DUMP_FILE" -d "$TARGET_URL" --clean --if-exists --no-owner

echo "restored $DUMP_FILE into $TARGET_URL"
