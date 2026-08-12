# PostgreSQL Implementation

Use PostgreSQL for control-plane relational state.

Initial domains:

```text
identity
organizations
applications
environments
credentials
releases
alerts
audit
```

Prioritize referential integrity, migrations, indexes, and transactional mutations.

PostgreSQL should not become the primary store for high-volume raw telemetry.
