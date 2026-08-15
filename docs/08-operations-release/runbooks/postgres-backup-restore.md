# Runbook — PostgreSQL Backup & Restore

**Scope:** the control-plane Postgres database only (`projects`, `alert_rules`, `alert_events`, `releases` — everything Bun/Drizzle owns, ADR-020/021). Matches `infrastructure.md`'s explicit list for this slice: *"back up PostgreSQL, configuration, alert definitions, identity/configuration metadata."*

**Explicitly out of scope for now** (tracked in `PROGRESS.md`'s Step 8 entry, not forgotten): ClickHouse telemetry backup — `infrastructure.md` itself notes *"telemetry backup policy depends on retention/durability requirements,"* a real separate policy decision (volume, retention window, RPO/RTO for telemetry specifically) this project hasn't made yet; object storage / source maps — no object storage exists yet (source maps aren't uploaded anywhere in this codebase yet either); a scheduled/automated backup cadence — these scripts are run manually today, cron/CI scheduling is separate future work.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/backup-postgres.sh` | `pg_dump` (custom format, `-Fc`) of `$DATABASE_URL` to `backups/postgres/frontwatch_<UTC timestamp>.dump` |
| `scripts/restore-postgres.sh <dump-file> [target-url]` | Restores a dump into a target database — defaults to a dedicated `frontwatch_restore_test` database, refuses any target whose name doesn't contain `_restore_test` unless `ALLOW_UNSAFE_RESTORE_TARGET=1` is set explicitly |
| `scripts/verify-postgres-backup.sh [dump-file]` | The full validation sequence in one command: backup (if no dump file given) → restore into the isolated target → compare row counts per table between source and restored |
| `scripts/dr-exercise.sh` | The real disaster recovery *exercise* (Step 9, PROGRESS.md) — see its own section below. Goes further than `verify-postgres-backup.sh`: destroys the real local Postgres container and volume, then executes this runbook's own "real recovery" procedure against the real local stack. |

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

## Procedure: running a disaster recovery exercise

`infrastructure.md`: *"Run recovery exercises periodically, not only when something has already gone wrong."* `scripts/dr-exercise.sh` runs the whole thing for real, unattended, against the real local dev stack — not the isolated-database check `verify-postgres-backup.sh` already covers, which never puts the actual recovery procedure above under test:

1. Seeds real baseline data (an org/project/alert rule) through the real HTTP routes.
2. Takes a real backup — this is the RPO boundary.
3. Creates *more* real data through the real routes, deliberately after the backup.
4. **Declares recovery mode and destroys the real Postgres container and its Docker volume** — a genuine "storage failure"/"cluster loss" scenario (`infrastructure.md`'s own named DR scenario list), not a database-level drop. This step is real and only reversible via the backup — confirm you're pointed at a disposable local dev environment before running it, the same caution the "real recovery" procedure above already carries.
5. Executes this runbook's own recovery sequence: restore infrastructure (recreate the container) → restore control data (`restore-postgres.sh`, `ALLOW_UNSAFE_RESTORE_TARGET=1`) → start services.
6. Validates: every service's `/health/ready`, the pre-backup project and alert rule are queryable, the *post*-backup project is confirmed genuinely gone (proving the RPO gap is real, not just that *something* survived), a fresh event ingests and reaches ClickHouse (the full ingestion → worker → storage pipeline works again, not just Postgres).
7. Reports measured RTO (wall-clock, disaster declared → fully validated) and the concrete RPO gap demonstrated, then cleans up its own seed data.

```
PG_BIN_DIR=/opt/homebrew/opt/postgresql@16/bin ./scripts/dr-exercise.sh
```

(`PG_BIN_DIR`: same reasoning as `backup-postgres.sh`'s own comment — point this at version-matched client tools if the Homebrew default is a newer major version than the docker-compose Postgres server.)

**Result of the first real run** (2026-08-15, local dev machine): **8/8 validations passed, RTO = 46 seconds.** The RPO gap was demonstrated concretely — a project created after the backup was confirmed genuinely absent post-recovery, not merely assumed lost. ClickHouse was untouched throughout (out of scope, per this runbook's own "explicitly out of scope" section above) and the full ingestion → worker → ClickHouse pipeline was confirmed working again once Postgres recovered. No gaps found in the recovery sequence itself on this run; `infrastructure.md`'s call to "run recovery exercises periodically" is the standing follow-up, not a one-time checkbox.

## Not yet defined

Formal RPO (max acceptable data loss) / RTO (max acceptable recovery time) *targets* — `infrastructure.md` calls for these "per customer deployment tier," which doesn't exist yet pre-pilot (`PROGRESS.md`: no real customer onboarded). The exercise above measures what RTO/RPO *currently is* on a local dev machine, which is a real, useful data point, but revisit setting an actual target once there's a real deployment tier to set one against.
