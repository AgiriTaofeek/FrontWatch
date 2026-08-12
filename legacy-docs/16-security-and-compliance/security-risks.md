# Security Risks

## R01 — Cross-Tenant Data Leakage

Mitigation: mandatory tenant scope, authorization tests, defense in depth.

## R02 — Sensitive Data in Telemetry

Mitigation: privacy-first SDK, redaction, documentation, server-side filtering.

## R03 — Compromised SDK

Mitigation: secure release pipeline, dependency controls, artifact verification.

## R04 — Ingestion Flood

Mitigation: quotas, rate limits, payload limits, backpressure.

## R05 — Dashboard Account Compromise

Mitigation: enterprise identity, MFA through IdP, session controls, audit.

## R06 — Source Code Exposure

Mitigation: private source maps and access controls.

## R07 — Supply Chain Attack

Mitigation: SBOM, scanning, protected CI, artifact signing where practical.

## R08 — Insider Abuse

Mitigation: least privilege, audit logging, access reviews.

## R09 — Insecure Self-Hosted Deployment

Mitigation: hardened defaults, preflight checks, deployment security documentation.
