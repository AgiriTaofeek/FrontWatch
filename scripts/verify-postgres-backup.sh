#!/usr/bin/env bash
set -euo pipefail

# usage: verify-postgres-backup.sh [dump-file]
#
# infrastructure.md's full backup validation sequence, made real and
# runnable rather than just documented: backup → isolated environment
# → restore → integrity checks. If no dump file is given, this backs
# up DATABASE_URL itself first — "verify the backup I have right now
# actually restores," the question that matters in a real incident.
#
# Integrity check here is a per-table row-count comparison between the
# live source and the freshly restored database — enough to catch the
# failure modes that actually matter for a backup (an empty/partial
# dump, a restore that silently drops rows, a schema mismatch that
# makes a table disappear entirely). It is not a full byte-for-byte
# diff — deliberately: the source database keeps receiving real writes
# for the whole duration of this script (this is a live system, not a
# maintenance-window snapshot), so an exact content comparison would
# be comparing two different points in time by construction, not a
# meaningful check. Row counts are stable enough to validate cheaply
# and still catch the failures that matter.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is not set}"
RESTORE_URL="${RESTORE_URL:-postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch_restore_test}"
# PG_BIN_DIR: see backup-postgres.sh's own comment. Propagates to the
# backup-postgres.sh/restore-postgres.sh sub-invocations below via the
# environment automatically — set once here too for this script's own
# direct psql calls.
PSQL="${PG_BIN_DIR:+$PG_BIN_DIR/}psql"

DUMP_FILE="${1:-}"
if [[ -z "$DUMP_FILE" ]]; then
	echo "== no dump file given — backing up $DATABASE_URL first =="
	BACKUP_OUTPUT="$("$SCRIPT_DIR/backup-postgres.sh")"
	echo "$BACKUP_OUTPUT"
	DUMP_FILE="$(echo "$BACKUP_OUTPUT" | sed -n 's/^backed up to \([^ ]*\).*/\1/p')"
fi

echo "== restoring $DUMP_FILE into $RESTORE_URL =="
"$SCRIPT_DIR/restore-postgres.sh" "$DUMP_FILE" "$RESTORE_URL"

echo "== comparing row counts, source vs. restored =="

# Every real (non-system) table in the schema — not a hardcoded list,
# so a future migration adding a table is covered automatically
# instead of silently skipped by a stale list here.
TABLES="$(psql "$DATABASE_URL" -t -A -c "select tablename from pg_tables where schemaname = 'public' order by tablename;")"

MISMATCHES=0
for table in $TABLES; do
	source_count="$("$PSQL" "$DATABASE_URL" -t -A -c "select count(*) from \"$table\";")"
	restored_count="$("$PSQL" "$RESTORE_URL" -t -A -c "select count(*) from \"$table\";")"

	if [[ "$source_count" == "$restored_count" ]]; then
		echo "  ok    $table: $source_count rows"
	else
		echo "  FAIL  $table: source=$source_count restored=$restored_count"
		MISMATCHES=$((MISMATCHES + 1))
	fi
done

if [[ "$MISMATCHES" -gt 0 ]]; then
	echo "== $MISMATCHES table(s) mismatched — backup did NOT verify cleanly =="
	exit 1
fi

echo "== all tables match — backup verified =="
