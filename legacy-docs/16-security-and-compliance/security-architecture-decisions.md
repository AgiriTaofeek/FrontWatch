# Security Architecture Decisions

## Decision 1 — Browser Credential Is Least Privilege

A browser-visible ingestion credential must not grant administrative access.

## Decision 2 — Tenant Scope Is Mandatory

Every protected query must establish tenant authorization before data access.

## Decision 3 — Privacy Before Transport

Sensitive telemetry should be filtered/redacted before leaving the browser where practical.

## Decision 4 — Backend Revalidates

Browser-side privacy is not sufficient. Server-side controls remain mandatory.

## Decision 5 — Audit Administrative Actions

Security-sensitive configuration changes must be auditable.

## Decision 6 — Source Maps Are Private

Source maps are treated as potentially sensitive source-code artifacts.

## Decision 7 — Security Is Layered

```text
SDK
 ↓
Ingestion
 ↓
Processing
 ↓
Storage
 ↓
API
 ↓
UI
 ↓
Infrastructure
```

No single layer is assumed to be sufficient.
