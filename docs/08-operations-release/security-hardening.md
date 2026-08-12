# FrontWatch — Operational Security Hardening

**Status:** Draft · Consolidates the operational-security portion of legacy `16-security-and-compliance/` (encryption, key-management, audit-logging, pii-protection, retention-and-deletion, vulnerability-management, supply-chain-security, incident-response). Architectural/threat-model-level security → `../05-architecture/security-architecture.md`; infra-level hardening (network/containers/K8s/TLS/secrets) → `infrastructure.md`.

## Encryption

In transit: TLS for production network communication — browser→ingestion, browser→dashboard, service→service, service→storage, per the customer's security model. At rest: customer-controlled infrastructure supports encryption at rest for PostgreSQL, ClickHouse, Redpanda, object storage, and backups. **Document exactly which layer provides encryption** (application, database, filesystem, cloud/platform) — avoid ambiguous claims like "encrypted" without saying where. Encryption keys are never hard-coded into application images or source control.

## Key management

Key types: database credentials, OIDC secrets, webhook signing keys, encryption keys, session/signing keys, TLS private keys. Requirements: secure storage, controlled access, rotation, revocation, auditability. Enterprise customers may require customer-managed keys — the architecture should allow integration with customer key-management infrastructure. Rotation design lets old/new keys overlap safely during transition. A compromised signing/integration key must be revocable **without rebuilding the entire product.**

## Audit logging

Records security-sensitive administrative activity: login, logout, role change, member added/removed, API credential created/revoked, alert rule changed, privacy configuration changed, retention changed, source map uploaded, data export, application deleted. Record shape: timestamp, actor, organization, action, resource, result, request_id, metadata. Audit records are protected against unauthorized modification/deletion, and must not themselves contain unnecessary sensitive telemetry. Security administrators can search audit events within their authorized scope.

## PII protection & retention

Goal: prevent FrontWatch from becoming an unnecessary repository of personally identifiable information. SDK never captures passwords, payment credentials, authorization headers, cookies, or full form values by default (see `../06-engineering-specs/sdk/privacy-and-security.md`). Prefer opaque/pseudonymous user identifiers. Documentation strongly discourages developers from placing passwords, tokens, financial credentials, or government IDs into custom telemetry context — the manual API doesn't stop them, so the guidance has to. Configurable redaction for headers, URLs, query parameters, input fields, metadata, breadcrumbs. **If a redaction rule fails unexpectedly, drop the field/event rather than send it.**

**Retention & deletion:** defined separately for raw telemetry, aggregated telemetry, issues, sessions, audit logs, source maps, backups. Principle: keep data only as long as it provides legitimate product/operational value or policy requires it. Deletion covers primary storage, derived data, object storage, indexes, and caches — and its interaction with backups is documented explicitly (a record deleted from primary storage may persist in backups until they expire). Enterprise customers configure retention within supported limits. Deletion jobs produce auditable completion/failure information without logging sensitive payloads.

## Vulnerability management

Lifecycle: discover → assess → prioritize → patch → verify → close. Prioritize by exploitability, impact, exposure, and customer environment. Track vulnerabilities across Go modules, npm packages, container images, OS packages, and build tooling. Critical remotely-exploitable issues get an expedited patch process. For material security issues affecting self-hosted customers: communicate affected versions, severity, mitigation, fixed versions, and upgrade instructions clearly — this is the security-specific instance of the general upgrade guidance in `release-strategy.md`.

## Supply chain security

Covers dependencies, source, build tools, base images, containers, SDK packages, Helm charts, deployment scripts. Controls: dependency scanning, lockfiles, secret scanning, SBOMs, image scanning, artifact signing where practical, protected release process. **The browser SDK has unusually high distribution impact** — a compromised SDK release could affect every customer application that pulls it — so SDK release controls are stricter than for ordinary internal packages.

## Security incident response

Lifecycle: detect → triage → contain → eradicate → recover → validate → post-incident review. Potential incidents: credential compromise, tenant isolation failure, data exfiltration, malicious SDK release, vulnerable dependency, infrastructure compromise. **Immediate priorities in order:** protect customers → stop further exposure → preserve evidence → determine scope → rotate/revoke affected credentials → patch the vulnerability → validate recovery. Preserve audit logs, application logs, deployment records, access records, security alerts as evidence. Define customer notification procedures for self-hosted customers according to contractual and regulatory requirements — this is distinct from and stricter than ordinary product-issue communication.
