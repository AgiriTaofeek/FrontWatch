# Runbook — PostgreSQL Backup & Restore

**Scope:** the control-plane Postgres database only (`projects`, `alert_rules`, `alert_events`, `releases` — everything Bun/Drizzle owns, ADR-020/021). Matches `infrastructure.md`'s explicit list for this slice: *"back up PostgreSQL, configuration, alert definitions, identity/configuration metadata."*

**Explicitly out of scope for now** (tracked in `PROGRESS.md`'s Step 8 entry, not forgotten): ClickHouse telemetry backup — `infrastructure.md` itself notes *"telemetry backup policy depends on retention/durability requirements,"* a real separate policy decision (volume, retention window, RPO/RTO for telemetry specifically) this project hasn't made yet; object storage / source maps — no object storage exists yet (source maps aren't uploaded anywhere in this codebase yet either); a scheduled/automated backup cadence — these scripts are run manually today, cron/CI scheduling is separate future work.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/backup-postgres.sh` | `pg_dump` (custom format, `-Fc`) of `$DATABASE_URL` to `backups/postgres/frontwatch_<UTC timestamp>.dump` |
| `scripts/restore-postgres.sh <dump-file> [target-url]` | Restores a dump into a target database — defaults to a dedicated `frontwatch_restore_test` database, refuses any target whose name doesn't contain `_restore_test` unless `ALLOW_UNSAFE_RESTORE_TARGET=1` is set explicitly |
| `scripts/verify-postgres-backup.sh [dump-file]` | The full validation sequence in one command: backup (if no dump file given) → restore into the isolated target → compare row counts per table between source and restored |

Also runnable via `bun run backup:postgres` / `restore:postgres` / `verify:postgres-backup` from the repo root.

## Why "restoration has been tested" is a real requirement here, not a formality

`infrastructure.md`: *"A backup is not valid until restoration has been tested: backup → isolated environment → restore → integrity checks → application validation."* A `pg_dump` that completes without error still doesn't prove the backup is usable — the restore step is where a corrupted dump, a version mismatch, or a permissions problem would actually surface. `verify-postgres-backup.sh` runs the whole sequence for real against a disposable database, not a note in a doc saying "this should work."

## Procedure: taking a backup

```
DATABASE_URL=postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch \
  bun run backup:postgres
```

Produces `backups/postgres/frontwatch_<timestamp>.dump`. `backups/` is gitignored — a database dump (even a local dev one) is real data and never belongs in source control, same reasoning `.env*` is already ignored for.

## Procedure: verifying a backup restores cleanly

```
DATABASE_URL=postgres://frontwatch:frontwatch_dev@localhost:5432/frontwatch \
  bun run verify:postgres-backup backups/postgres/frontwatch_<timestamp>.dump
```

Reports a per-table row-count comparison (`ok`/`FAIL` per table) and exits non-zero if anything mismatches. Run this after every backup you'd actually rely on, not just once when the scripts were written.

## Procedure: real recovery (restoring over a live database)

This is a deliberate, rare, high-consequence action — not `restore-postgres.sh`'s default behavior (see the safety guard above). Before running:

1. **Declare recovery mode** — stop `control-api` and the `alert-evaluator` (both write to this database) so nothing writes to it mid-restore.
2. Confirm which dump file is being restored and when it was taken — know the exact RPO (data loss window) this recovery implies before committing to it.
3. Run `restore-postgres.sh <dump-file> <real-database-url>` with `ALLOW_UNSAFE_RESTORE_TARGET=1` set explicitly.
4. Restart `control-api` and the `alert-evaluator`.
5. **Validate**: `curl /health/ready` on `control-api` (ADR-026) is `up`, spot-check a few known rows, confirm the dashboard loads real data.
6. Document the incident — what was lost (the RPO window from step 2), why, and any follow-up (`release-strategy.md`'s "launch decision is recorded explicitly" discipline applies to real recoveries too: write down what happened, don't just move on once symptoms clear).

## Not yet defined

Formal RPO (max acceptable data loss) / RTO (max acceptable recovery time) targets — `infrastructure.md` calls for these "per customer deployment tier," which doesn't exist yet pre-pilot (`PROGRESS.md`: no real customer onboarded). Revisit once there's a real deployment tier to set a target against, not before.
