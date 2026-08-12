# E10 — Security

## RBAC
- Administrator.
- Engineer.
- Viewer.
- Permission checks.
- Authorization tests.

## Tenant Isolation
- Scope every repository/query.
- Cross-tenant negative tests.
- Ingestion isolation tests.
- Export isolation tests.

## Audit
Record login, role changes, credential changes, configuration changes, exports, and deletion.

## Privacy
- SDK defaults.
- Server redaction.
- Retention.
- Deletion.

## Secrets
- Secure storage.
- Rotation.
- No secret logging.
- Credential revocation.

**Acceptance:** no user or credential can access another tenant outside authorized scope.
