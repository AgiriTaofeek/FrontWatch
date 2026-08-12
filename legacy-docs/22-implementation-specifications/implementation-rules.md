# Implementation Rules

1. Prefer a modular monolith for the Bun control plane initially.
2. Keep the Go data plane small and independently scalable.
3. Do not create microservices without an operational reason.
4. Contracts precede cross-boundary implementation.
5. Tenant isolation is enforced server-side.
6. Telemetry is untrusted input.
7. Monitoring must never break the monitored application.
8. Every critical path has metrics and structured logs.
9. Every persistent schema change has a migration.
10. Benchmark ClickHouse and telemetry throughput with realistic data.
