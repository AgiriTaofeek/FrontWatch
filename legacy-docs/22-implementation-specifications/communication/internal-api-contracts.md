# Internal API Contracts

The Bun control API is the public backend interface to the dashboard.

Contracts should define:

```text
request
response
errors
pagination
filters
authorization expectations
```

For Go-facing ingestion, use the telemetry event contract rather than coupling the dashboard API to Go implementation details.
