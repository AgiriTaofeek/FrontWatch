# FrontWatch — Security & Compliance

Security is a core product requirement because FrontWatch is intended for banking and regulated web applications.

## Security objectives

1. Protect telemetry confidentiality.
2. Prevent cross-tenant access.
3. Minimize sensitive data collection.
4. Protect ingestion and APIs from abuse.
5. Secure the SDK supply chain.
6. Make administrative actions auditable.
7. Support customer security controls.
8. Make incidents detectable and recoverable.

## Security model

```text
Customer Application
       │
       ▼
    SDK / Browser
       │
       ▼
 Ingestion Boundary
       │
       ▼
 Processing / Queue
       │
       ├── PostgreSQL
       ├── ClickHouse
       └── Object Storage
       │
       ▼
 Dashboard / API
       │
       ▼
 Users / Operators
```

Every boundary must have an explicit trust model.

## Important distinction

Self-hosting reduces third-party exposure, but it does not automatically provide:

- encryption
- least privilege
- tenant isolation
- secure defaults
- auditability
- vulnerability management

Those must be designed and verified.
