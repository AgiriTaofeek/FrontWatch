# Backend Security Implementation

## Tenant Scoping

Tenant scope should be established from the authenticated principal.

Never rely only on a request body field.

## Authorization Middleware

Authentication establishes identity.

Authorization establishes access.

Keep these concepts separate.

## Ingestion Credentials

Credentials should identify:

```text
project
application
environment
```

and have minimal privileges.

## Input Limits

Apply limits before expensive processing.

## SQL

Use parameterized queries.

## ClickHouse

Treat filters as structured values, not arbitrary SQL fragments.

## Secrets

Use deployment secret mechanisms.

Do not log credentials.

## Audit

Record sensitive administrative actions.

## Security Headers

Dashboard HTTP responses should use appropriate security headers.

## Supply Chain

Pin/review dependencies and scan production images/dependencies regularly.
