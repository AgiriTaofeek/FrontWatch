# FrontWatch — Query Architecture

## Query Categories

### Overview Queries

```text
Current error rate
Active issues
Health
Performance trend
Latest deployment
```

### Investigation Queries

```text
Issue occurrences
Affected sessions
Breadcrumbs
Network activity
Release correlation
```

### Analytical Queries

```text
Performance by route
Errors by browser
Release comparison
Error trends
```

## Query Principle

The UI should never need to understand raw storage layout.

```text
Web App
   ↓
Query API
   ↓
Domain query
   ↓
Storage adapter
   ↓
Telemetry store
```

## Query API Responsibilities

- authorization
- tenant isolation
- validation
- pagination
- filtering
- aggregation
- result shaping

## Investigation Query

An issue page may need:

```text
Issue metadata
+
trend
+
top affected routes
+
top affected releases
+
affected sessions
+
network evidence
+
performance evidence
```

The query architecture should avoid making seven sequential high-latency requests when the UX needs a coherent investigation view.

## Pagination

Large telemetry collections require cursor-based pagination where appropriate.

Avoid offset pagination for very large event datasets.

## Query Limits

Protect the system from expensive arbitrary queries.

Potential controls:

- time-window limits
- maximum result sizes
- query timeouts
- rate limits
- query complexity limits

## Caching

Cache carefully.

Good candidates:

- relatively stable control-plane metadata
- common dashboard aggregates
- release metadata

Do not cache sensitive investigation results beyond policy.
