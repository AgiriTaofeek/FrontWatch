# E12 — Testing & Release

## Automated
- Unit.
- Integration.
- Contract.
- Browser E2E.
- Accessibility.

## Compatibility
Run the supported framework/browser matrix.

## Load
Test normal, peak, and incident telemetry volume.

## Failure
Test database, queue, ClickHouse, worker, and network failures.

## Security
Run SAST, dependency scanning, secret scanning, container scanning, authorization, and tenant-isolation tests.

## Release Gates
Block critical security defects, data corruption, tenant-isolation failures, critical ingestion failures, and unsafe migrations.

**Acceptance:** release artifacts are traceable and unsafe releases are blocked.
