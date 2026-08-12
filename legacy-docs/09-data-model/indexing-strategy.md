# FrontWatch — Indexing Strategy

Indexes should be driven by actual queries rather than by every available field.

## Control Plane Indexes

### Organization

```text
id
```

### Membership

```text
organization_id
user_id
unique(organization_id, user_id)
```

### Application

```text
organization_id
```

### Environment

```text
application_id
```

### Release

```text
application_id
version
created_at
```

### Deployment

```text
environment_id
deployed_at
release_id
```

## Telemetry Access Dimensions

Common query dimensions:

```text
application
environment
timestamp
event_type
release
issue
session
route
```

## Time Is a First-Class Dimension

Most telemetry queries are time-bounded.

Therefore physical storage should support efficient time filtering and retention.

## High Cardinality

Potentially dangerous fields:

```text
session_id
user_id
full URL
error fingerprint
request ID
```

Do not automatically create expensive indexes for every high-cardinality field.

## Issue Queries

Optimize for:

```text
application + environment + issue + time
```

## Session Queries

Optimize for:

```text
session_id + timestamp
```

## Release Queries

Optimize for:

```text
application + release + time
```

## Route Queries

Optimize for:

```text
application + route + time
```

only if route-level investigation is sufficiently frequent to justify the index.

## Principle

An index should answer a known product query.

Avoid speculative indexing.
