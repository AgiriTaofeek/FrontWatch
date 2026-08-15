# ADR-028 — k6 for Load Testing

## Status
Accepted

## Decision
Use [k6](https://k6.io) (Grafana's open-source load-testing tool) to drive `loadtest/`'s scenarios — scripted in its native JavaScript API, run manually against a live local (or later, staging) stack, not wired into CI.

## Context
`operations.md`'s data-plane testing strategy names Load as one of its seven required test categories: *"ingestion throughput, processing throughput, query latency, queue lag, storage insert performance."* `test-strategy.md` gives it a concrete traffic-pattern shape to test against: *"normal traffic, peak traffic, incident spike, sustained high volume, and recovery after a spike"* with named variables (events/sec, average event size, batch size, query concurrency, retention, worker count) and named things to measure (ingestion latency, queue lag, processing throughput, storage latency, API latency, error rate, resource usage). No tool was named anywhere in the docs — a genuinely open choice, `decisions/README.md`'s own "not yet load-tested" note on cache/ephemeral-state technology is the closest existing reference, and it's about a *different* open question (Valkey), not this one.

Candidates considered:
- **k6** — scriptable in JS, first-class staged VU ramps (`ramping-vus` executor) that map directly onto test-strategy.md's named stages, built-in percentile/threshold reporting, a single static binary (`brew install k6`), no runtime dependency added to the monorepo itself (it's a dev tool, not a shipped dependency).
- **A custom Go load generator** — would fit this repo's own data-plane language, but means hand-rolling VU ramping, percentile computation, and threshold/pass-fail reporting from scratch just to reinvent what k6 already does correctly. Rejected: more code, more places to get benchmarking math wrong, for a tool that only needs to *drive* HTTP traffic, not implement product logic.
- **vegeta / hey / wrk** — solid single-endpoint constant-rate hammers, but none script a staged, mixed-traffic scenario (ramping concurrency, randomized realistic event payloads, a background write load running concurrently with a separate read-latency scenario) without dropping into a wrapper script that ends up reimplementing k6's scenario model piecemeal.

## Rationale
k6's scenario model (`options.scenarios`, `executor: "ramping-vus"`) is a direct match for test-strategy.md's own stage names — `loadtest/scenarios/ingestion.js`'s five stages (warm-up → normal → peak → spike → sustained → recovery) read as a literal transcription of that spec, not an approximation. Its built-in summary (percentiles, error rate, custom `Counter`/`Rate` metrics for events accepted/rejected) covers everything `operations.md` asks to measure at the HTTP boundary without external plugins. Queue lag and processing-throughput/correctness (the two things k6 itself can't see, since they're on the far side of the queue) are checked separately by `loadtest/run.sh` via `rpk group describe` and a ClickHouse row count compared against k6's own reported accepted-event count — k6 measures the boundary it's actually driving, not everything the spec names.

Not wired into CI, deliberately, matching `scripts/backup-postgres.sh`'s precedent for operational (not correctness) tooling: a load test needs the full live stack up, takes several minutes, and produces a capacity measurement to be read and reasoned about — not a boolean a pull request should block on. `test-strategy.md` itself places load testing under "conditional, depending on the change," not "required before any production release."

## Consequence
`loadtest/` gains a real, runnable load-testing harness (`provision.sh` → real org/project via the actual HTTP routes, three k6 scenarios, `run.sh` orchestrating a full pass end-to-end, `teardown.sh` cleaning up after itself even on failure). Every future contributor gets the same reproducible traffic-pattern test rather than an ad hoc `curl` loop. Deferred, not forgotten: a real staging/production topology pass (this ADR's numbers are single-laptop, all-services-colocated — see `loadtest/README.md`'s own caveat), resource-usage capture (CPU/memory per service during the run — `docker stats`/`go tool pprof` could feed this in later, not built here), and SDK-side/browser-origin load (this harness drives the ingestion HTTP API directly, not a real browser running the SDK under load).
