# Bun ↔ Go Boundary

The primary shared boundary is data contracts plus storage/message infrastructure.

```text
Browser
  ↓
Go ingestion
  ↓
Redpanda
  ↓
Go processing
  ↓
ClickHouse
  ↑
Bun query API
```

Bun does not call Go internals directly.

If a direct service-to-service API becomes necessary later, introduce an explicit versioned internal contract.

This keeps the MVP simple and avoids unnecessary RPC complexity.
