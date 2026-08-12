# PostgreSQL Access

## PostgreSQL Owns

```text
organizations
users
memberships
applications
environments
projects
releases
deployments
alert_rules
audit_records
```

## Access Pattern

Use a PostgreSQL driver and a small data-access layer.

## Transactions

Use transactions for operations requiring atomic changes.

Example:

```text
Create application
+
Create initial environment
+
Create project
```

if the product requires them to be created atomically.

## Migrations

Use versioned migrations.

Migrations should be:

- deterministic
- reviewable
- reversible where practical
- safe for production

## Connection Pool

Configure explicit:

- max open connections
- max idle connections
- connection lifetime

Do not allow unbounded database connections.
