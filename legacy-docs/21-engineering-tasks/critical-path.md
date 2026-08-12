# Critical Path

```text
E01 Foundation
  ↓
E02 Control Plane
  ↓
E03 SDK
  ↓
E04 Ingestion
  ↓
E05 Processing
  ↓
E06 Storage
  ↓
E07 Query API
  ↓
E08 Dashboard
```

The first vertical slice is:

```text
capture JS error
→ ingest
→ queue
→ process
→ store
→ fingerprint/group
→ query
→ display
```

Then expand into session, network, performance, release, and alerts.
