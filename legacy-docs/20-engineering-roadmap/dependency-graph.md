# Dependency Graph

The major dependency chain is:

```text
Platform Foundation
       ↓
Control Plane
       ↓
SDK + Ingestion
       ↓
Queue
       ↓
Processing
       ↓
Storage
       ↓
Query API
       ↓
Dashboard
       ↓
Investigation
```

Operational/security dependencies cut across the entire graph:

```text
Security ───────────────┐
Testing ────────────────┼──→ every milestone
Infrastructure ────────┤
Observability ──────────┘
```

## Critical Path

```text
SDK
 ↓
Ingestion
 ↓
Processing
 ↓
Storage
 ↓
Issue API
 ↓
Issue UI
```

This is the shortest path to demonstrating product value.
